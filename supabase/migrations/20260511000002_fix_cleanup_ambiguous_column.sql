-- Fix ambiguous column reference in cleanup_stale_games.
-- "game_id" is both a return-table variable and a matches column;
-- qualify the matches column with its table name to resolve it.

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
    if coalesce(jsonb_array_length(v_game.move_history), 0) < 10 then
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
