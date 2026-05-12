-- ─── Game creation limits ─────────────────────────────────────────────────────
-- Enforces: one open (waiting) challenge per user, max 5 active games.
-- Runs as BEFORE INSERT trigger so it applies regardless of client.

create or replace function check_game_creation_limits()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_waiting_count int;
  v_active_count  int;
begin
  select count(*) into v_waiting_count
  from games
  where white_id = NEW.white_id and status = 'waiting';

  if v_waiting_count >= 1 then
    raise exception 'You already have an open challenge waiting for a player. Cancel it first.';
  end if;

  select count(*) into v_active_count
  from games
  where (white_id = NEW.white_id or black_id = NEW.white_id) and status = 'active';

  if v_active_count >= 5 then
    raise exception 'You already have 5 games in progress. Forfeit one to start a new one.';
  end if;

  return NEW;
end;
$$;

drop trigger if exists enforce_game_creation_limits on games;
create trigger enforce_game_creation_limits
  before insert on games
  for each row execute function check_game_creation_limits();

-- ─── join_game: also check active game limit for the joiner ──────────────────

create or replace function join_game(p_game_id uuid) returns games
language plpgsql security definer set search_path = public as $$
declare
  v_game         games;
  v_uid          uuid := auth.uid();
  v_active_count int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select count(*) into v_active_count
  from games
  where (white_id = v_uid or black_id = v_uid) and status = 'active';

  if v_active_count >= 5 then
    raise exception 'You already have 5 games in progress. Forfeit one before joining a new one.';
  end if;

  select * into v_game from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if v_game.status <> 'waiting' then raise exception 'game not available'; end if;
  if v_game.white_id = v_uid then raise exception 'cannot join your own game'; end if;

  update games set
    black_id   = v_uid,
    status     = 'active',
    updated_at = now()
  where id = p_game_id
  returning * into v_game;

  return v_game;
end;
$$;

revoke all on function join_game(uuid) from public;
grant execute on function join_game(uuid) to authenticated;

-- ─── abandon_game: early-game exit with no ELO impact ────────────────────────
-- Only allowed while the game has fewer than 10 total half-moves (5 per player).
-- Beyond that the player must forfeit, which counts as a loss.

create or replace function abandon_game(p_game_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_game games;
  v_uid  uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into v_game from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if v_game.status <> 'active' then raise exception 'game is not active'; end if;

  if v_game.white_id <> v_uid and v_game.black_id <> v_uid then
    raise exception 'you are not a participant in this game';
  end if;

  if jsonb_array_length(v_game.move_history) >= 10 then
    raise exception 'too many moves to abandon — use forfeit instead';
  end if;

  update games set
    status     = 'abandoned',
    updated_at = now()
  where id = p_game_id;
end;
$$;

revoke all on function abandon_game(uuid) from public;
grant execute on function abandon_game(uuid) to authenticated;

-- ─── cleanup_stale_games ──────────────────────────────────────────────────────
-- Sweeps waiting and active games idle for p_stale_days days (default 7).
--
-- Rules:
--   waiting games            → abandoned (no ELO; only one player involved)
--   active, < 10 moves       → abandoned (game barely started)
--   active, 10+ moves, gap ≥ 5 pts → finished with winner + ELO awarded inline
--   active, 10+ moves, gap < 5 pts → abandoned (too close to call)
--
-- Piece values: Q/q=9, R/r=5, B/b=3, N/n=3, P/p=1
-- Run from the Supabase SQL editor (service_role only):
--   select * from cleanup_stale_games();

create or replace function cleanup_stale_games(p_stale_days int default 7)
returns table(
  game_id    uuid,
  outcome    text,
  white_mat  int,
  black_mat  int,
  idle_since timestamptz
)
language plpgsql security definer set search_path = public as $$
declare
  v_game      games;
  v_cutoff    timestamptz := now() - (p_stale_days || ' days')::interval;
  v_white     profiles;
  v_black     profiles;
  v_white_mat int;
  v_black_mat int;
  v_winner    text;
  v_we        float;
  v_be        float;
  v_wa        float;
  v_ba        float;
  v_w_new     int;
  v_b_new     int;
  v_k constant int := 32;
begin
  -- Sweep stale waiting games (no ELO — only one player was involved)
  for v_game in
    select * from games
    where status = 'waiting' and updated_at < v_cutoff
    for update
  loop
    update games set status = 'abandoned', updated_at = now() where id = v_game.id;
    game_id    := v_game.id;
    outcome    := 'abandoned';
    white_mat  := null;
    black_mat  := null;
    idle_since := v_game.updated_at;
    return next;
  end loop;

  -- Sweep stale active games
  for v_game in
    select * from games
    where status = 'active' and updated_at < v_cutoff
    for update
  loop
    -- Too few moves — clearly just a forgotten game
    if jsonb_array_length(v_game.move_history) < 10 then
      update games set status = 'abandoned', updated_at = now() where id = v_game.id;
      game_id    := v_game.id;
      outcome    := 'abandoned';
      white_mat  := null;
      black_mat  := null;
      idle_since := v_game.updated_at;
      return next;
      continue;
    end if;

    -- Count material from the stored board
    select
      coalesce(sum(case c.piece
        when 'Q' then 9 when 'R' then 5 when 'B' then 3 when 'N' then 3 when 'P' then 1
        else 0 end), 0),
      coalesce(sum(case c.piece
        when 'q' then 9 when 'r' then 5 when 'b' then 3 when 'n' then 3 when 'p' then 1
        else 0 end), 0)
    into v_white_mat, v_black_mat
    from (
      select jsonb_array_elements(jsonb_array_elements(v_game.board)) #>> '{}' as piece
    ) c
    where c.piece is not null and c.piece <> 'null';

    if v_white_mat - v_black_mat >= 5 then
      v_winner := 'white';
    elsif v_black_mat - v_white_mat >= 5 then
      v_winner := 'black';
    else
      v_winner := null;
    end if;

    -- Too close to call — abandon with no ELO
    if v_winner is null then
      update games set status = 'abandoned', updated_at = now() where id = v_game.id;
      game_id    := v_game.id;
      outcome    := 'abandoned';
      white_mat  := v_white_mat;
      black_mat  := v_black_mat;
      idle_since := v_game.updated_at;
      return next;
      continue;
    end if;

    -- Declare winner and award ELO inline (mirrors finalize_match; K=32)
    update games set
      status     = 'finished',
      winner     = v_winner,
      updated_at = now()
    where id = v_game.id;

    -- Idempotent: skip ELO if match record already exists
    if exists (select 1 from matches where game_id = v_game.id) then
      game_id    := v_game.id;
      outcome    := v_winner || '_wins';
      white_mat  := v_white_mat;
      black_mat  := v_black_mat;
      idle_since := v_game.updated_at;
      return next;
      continue;
    end if;

    select * into v_white from profiles where id = v_game.white_id;
    select * into v_black from profiles where id = v_game.black_id;

    v_we    := 1.0 / (1 + power(10, (v_black.elo - v_white.elo)::float / 400));
    v_be    := 1.0 / (1 + power(10, (v_white.elo - v_black.elo)::float / 400));
    v_wa    := case when v_winner = 'white' then 1.0 else 0.0 end;
    v_ba    := case when v_winner = 'black' then 1.0 else 0.0 end;
    v_w_new := v_white.elo + round(v_k * (v_wa - v_we));
    v_b_new := v_black.elo + round(v_k * (v_ba - v_be));

    insert into matches (
      game_id, white_id, black_id, result,
      white_elo_before, black_elo_before,
      white_elo_after,  black_elo_after,
      moves
    ) values (
      v_game.id, v_game.white_id, v_game.black_id, v_winner,
      v_white.elo, v_black.elo,
      v_w_new, v_b_new,
      v_game.move_history
    );

    update profiles set
      elo    = v_w_new,
      wins   = wins   + (case when v_winner = 'white' then 1 else 0 end),
      losses = losses + (case when v_winner = 'black' then 1 else 0 end)
    where id = v_game.white_id;

    update profiles set
      elo    = v_b_new,
      wins   = wins   + (case when v_winner = 'black' then 1 else 0 end),
      losses = losses + (case when v_winner = 'white' then 1 else 0 end)
    where id = v_game.black_id;

    game_id    := v_game.id;
    outcome    := v_winner || '_wins';
    white_mat  := v_white_mat;
    black_mat  := v_black_mat;
    idle_since := v_game.updated_at;
    return next;
  end loop;
end;
$$;

-- Restrict to service_role — run from the Supabase SQL editor only
revoke all on function cleanup_stale_games(int) from public;
revoke all on function cleanup_stale_games(int) from authenticated;
