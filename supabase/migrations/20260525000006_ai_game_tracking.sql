-- Track AI games as rows in the games table so stale games can be cleaned up.
-- Adds ai_difficulty to games, a finalize_ai_game RPC, and updates
-- cleanup_stale_games to handle AI games (black_id IS NULL, ai_difficulty set).

-- ─── games.ai_difficulty ──────────────────────────────────────────────────────

alter table games add column if not exists ai_difficulty text;

alter table games drop constraint if exists games_ai_difficulty_check;
alter table games add constraint games_ai_difficulty_check
  check (ai_difficulty is null or ai_difficulty = any (
    array['beginner', 'easy', 'medium', 'hard']
  ));

-- ─── finalize_ai_game ─────────────────────────────────────────────────────────
-- Marks an AI game finished, records the match, and applies ELO.
-- Idempotent: safe to call again if the match row already exists.
-- Returns the player's ELO delta (0 for draws).

create or replace function finalize_ai_game(p_game_id uuid, p_winner text)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_game    games;
  v_profile profiles;
  v_ai_elo  int;
  v_we      float;
  v_wa      float;
  v_new_elo int;
  v_delta   int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select * into v_game from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if v_game.ai_difficulty is null then raise exception 'not an AI game'; end if;
  if auth.uid() <> v_game.white_id then raise exception 'not your game'; end if;

  -- Already finished — return existing delta (idempotent)
  if v_game.status = 'finished' then
    select coalesce(white_elo_after - white_elo_before, 0)
    into v_delta
    from matches
    where matches.game_id = p_game_id;
    return coalesce(v_delta, 0);
  end if;

  update games set status = 'finished', winner = p_winner, updated_at = now()
  where id = p_game_id;

  -- Match already recorded (shouldn't happen, but be safe)
  if exists (select 1 from matches where matches.game_id = p_game_id) then
    return 0;
  end if;

  select * into v_profile from profiles where id = v_game.white_id;

  v_ai_elo := case v_game.ai_difficulty
    when 'beginner' then  600
    when 'easy'     then 1000
    when 'medium'   then 1200
    when 'hard'     then 1400
    else                 1000
  end;

  -- Draws don't affect ELO
  if p_winner = 'draw' then
    insert into matches (
      game_id, white_id, black_id, ai_difficulty, result,
      white_elo_before, black_elo_before, white_elo_after, black_elo_after, moves
    ) values (
      p_game_id, v_game.white_id, null, v_game.ai_difficulty, 'draw',
      v_profile.elo, v_ai_elo, v_profile.elo, v_ai_elo, v_game.move_history
    );
    update profiles set draws = draws + 1 where id = v_game.white_id;
    return 0;
  end if;

  v_we      := 1.0 / (1 + power(10, (v_ai_elo - v_profile.elo)::float / 400));
  v_wa      := case when p_winner = 'white' then 1.0 else 0.0 end;
  v_new_elo := v_profile.elo + round(32 * (v_wa - v_we));
  v_delta   := v_new_elo - v_profile.elo;

  insert into matches (
    game_id, white_id, black_id, ai_difficulty, result,
    white_elo_before, black_elo_before, white_elo_after, black_elo_after, moves
  ) values (
    p_game_id, v_game.white_id, null, v_game.ai_difficulty, p_winner,
    v_profile.elo, v_ai_elo, v_new_elo, v_ai_elo, v_game.move_history
  );

  update profiles set
    elo    = v_new_elo,
    wins   = wins   + (case when p_winner = 'white' then 1 else 0 end),
    losses = losses + (case when p_winner = 'black' then 1 else 0 end)
  where id = v_game.white_id;

  return v_delta;
end;
$$;

revoke all on function finalize_ai_game(uuid, text) from public;
revoke all on function finalize_ai_game(uuid, text) from authenticated;
grant execute on function finalize_ai_game(uuid, text) to authenticated;

-- ─── cleanup_stale_games (updated) ───────────────────────────────────────────
-- Extended to handle AI games (black_id IS NULL, ai_difficulty IS NOT NULL).
-- AI game logic: < 10 moves → abandon; AI ahead ≥ 5 pts → AI wins with ELO;
-- everything else (close or player ahead) → abandon with no ELO impact.

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
  v_ai_elo    int;
  v_new_elo   int;
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
    -- ── AI games ──────────────────────────────────────────────────────────────
    if v_game.ai_difficulty is not null then

      -- Too few moves — forgotten game, no ELO
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

      -- Count material
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

      -- Only penalise the player when the AI is clearly ahead.
      -- If it's close or the player is winning, abandon with no ELO impact
      -- (they might have had a winning game and just never closed it).
      if v_black_mat - v_white_mat < 5 then
        update games set status = 'abandoned', updated_at = now() where id = v_game.id;
        game_id    := v_game.id;
        outcome    := 'abandoned';
        white_mat  := v_white_mat;
        black_mat  := v_black_mat;
        idle_since := v_game.updated_at;
        return next;
        continue;
      end if;

      -- AI is winning by ≥ 5 points — count as player loss
      update games set status = 'finished', winner = 'black', updated_at = now()
      where id = v_game.id;

      if exists (select 1 from matches where matches.game_id = v_game.id) then
        game_id    := v_game.id;
        outcome    := 'black_wins';
        white_mat  := v_white_mat;
        black_mat  := v_black_mat;
        idle_since := v_game.updated_at;
        return next;
        continue;
      end if;

      select * into v_white from profiles where id = v_game.white_id;

      v_ai_elo := case v_game.ai_difficulty
        when 'beginner' then  600
        when 'easy'     then 1000
        when 'medium'   then 1200
        when 'hard'     then 1400
        else                 1000
      end;

      v_we      := 1.0 / (1 + power(10, (v_ai_elo - v_white.elo)::float / 400));
      v_new_elo := v_white.elo + round(v_k * (0.0 - v_we));

      insert into matches (
        game_id, white_id, black_id, ai_difficulty, result,
        white_elo_before, black_elo_before, white_elo_after, black_elo_after, moves
      ) values (
        v_game.id, v_game.white_id, null, v_game.ai_difficulty, 'black',
        v_white.elo, v_ai_elo, v_new_elo, v_ai_elo, v_game.move_history
      );

      update profiles set
        elo    = v_new_elo,
        losses = losses + 1
      where id = v_game.white_id;

      game_id    := v_game.id;
      outcome    := 'black_wins';
      white_mat  := v_white_mat;
      black_mat  := v_black_mat;
      idle_since := v_game.updated_at;
      return next;
      continue;
    end if;

    -- ── PvP games (existing logic) ─────────────────────────────────────────────

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

    -- Gap too close to call — leave the game alone
    if v_winner is null then
      continue;
    end if;

    -- Winner is the one who hasn't moved — they may be stalling; leave it alone
    if v_winner = v_game.turn then
      continue;
    end if;

    -- Loser is holding up the game — declare winner and award ELO

    update games set
      status     = 'finished',
      winner     = v_winner,
      updated_at = now()
    where id = v_game.id;

    -- Idempotent: skip ELO if match record already exists
    if exists (select 1 from matches where matches.game_id = v_game.id) then
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

revoke all on function cleanup_stale_games(int) from public;
revoke all on function cleanup_stale_games(int) from authenticated;
grant execute on function cleanup_stale_games(int) to service_role;
