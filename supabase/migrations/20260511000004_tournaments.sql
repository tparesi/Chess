-- Swiss-system tournament support.
-- Tables: tournaments, tournament_participants, tournament_rounds, tournament_pairings
-- RPCs:   join_tournament, start_tournament, create_tournament_round,
--         settle_tournament_game, finish_tournament

-- ─── tournaments ────────────────────────────────────────────────────
create table if not exists tournaments (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  host_id       uuid not null references profiles(id),
  status        text not null default 'lobby',
  rounds_total  int  not null default 5,
  current_round int  not null default 0,
  created_at    timestamptz not null default now(),
  check (status in ('lobby', 'active', 'finished')),
  check (rounds_total between 1 and 10),
  check (current_round >= 0)
);

create index if not exists tournaments_status_idx on tournaments (status);
create index if not exists tournaments_host_idx   on tournaments (host_id);

-- ─── tournament_participants ─────────────────────────────────────────
create table if not exists tournament_participants (
  tournament_id uuid  not null references tournaments(id) on delete cascade,
  player_id     uuid  not null references profiles(id),
  score         float not null default 0,
  color_balance int   not null default 0,  -- whites_played - blacks_played
  primary key (tournament_id, player_id)
);

-- ─── tournament_rounds ───────────────────────────────────────────────
create table if not exists tournament_rounds (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  round_number  int  not null,
  started_at    timestamptz not null default now(),
  unique (tournament_id, round_number)
);

-- ─── tournament_pairings ─────────────────────────────────────────────
create table if not exists tournament_pairings (
  id       uuid primary key default gen_random_uuid(),
  round_id uuid not null references tournament_rounds(id) on delete cascade,
  white_id uuid references profiles(id),
  black_id uuid references profiles(id),  -- null = bye
  game_id  uuid references games(id),     -- null = bye
  result   text,                          -- 'white'|'black'|'draw'|'bye'|null=pending
  check (result is null or result in ('white', 'black', 'draw', 'bye'))
);

create index if not exists tp_game_idx  on tournament_pairings (game_id);
create index if not exists tp_round_idx on tournament_pairings (round_id);

-- ─── RLS ─────────────────────────────────────────────────────────────
alter table tournaments             enable row level security;
alter table tournament_participants enable row level security;
alter table tournament_rounds       enable row level security;
alter table tournament_pairings     enable row level security;

create policy "tournaments: public read"
  on tournaments for select using (true);
create policy "tournaments: auth create"
  on tournaments for insert with check (auth.uid() = host_id);

create policy "tournament_participants: public read"
  on tournament_participants for select using (true);

create policy "tournament_rounds: public read"
  on tournament_rounds for select using (true);

create policy "tournament_pairings: public read"
  on tournament_pairings for select using (true);

-- ─── join_tournament ─────────────────────────────────────────────────
create or replace function join_tournament(p_tournament_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_t tournaments;
begin
  select * into v_t from tournaments where id = p_tournament_id;
  if not found then raise exception 'Tournament not found'; end if;
  if v_t.status != 'lobby' then raise exception 'Tournament is not accepting players'; end if;

  insert into tournament_participants (tournament_id, player_id)
  values (p_tournament_id, auth.uid())
  on conflict do nothing;
end;
$$;
revoke all on function join_tournament(uuid) from public;
grant  execute on function join_tournament(uuid) to authenticated;

-- ─── start_tournament ────────────────────────────────────────────────
create or replace function start_tournament(p_tournament_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_t     tournaments;
  v_count int;
begin
  select * into v_t from tournaments where id = p_tournament_id;
  if not found then raise exception 'Tournament not found'; end if;
  if v_t.host_id != auth.uid() then raise exception 'Only the host can start the tournament'; end if;
  if v_t.status != 'lobby' then raise exception 'Tournament is already started'; end if;

  select count(*) into v_count
  from tournament_participants where tournament_id = p_tournament_id;
  if v_count < 2 then raise exception 'Need at least 2 participants'; end if;

  update tournaments set status = 'active' where id = p_tournament_id;
end;
$$;
revoke all on function start_tournament(uuid) from public;
grant  execute on function start_tournament(uuid) to authenticated;

-- ─── create_tournament_round ─────────────────────────────────────────
-- Accepts pre-computed pairings from the client (Swiss algorithm runs in JS).
-- p_pairings: JSONB array of {"white_id":"<uuid>","black_id":"<uuid>|null"}.
-- black_id omitted or null means a bye for white_id (+1 point, no game).
create or replace function create_tournament_round(
  p_tournament_id uuid,
  p_pairings      jsonb
)
returns uuid  -- new round_id
language plpgsql security definer set search_path = public as $$
declare
  v_t         tournaments;
  v_round_num int;
  v_round_id  uuid;
  v_pairing   jsonb;
  v_white_id  uuid;
  v_black_id  uuid;
  v_game_id   uuid;
  v_prev_done boolean;
begin
  select * into v_t from tournaments where id = p_tournament_id;
  if not found      then raise exception 'Tournament not found'; end if;
  if v_t.host_id != auth.uid() then raise exception 'Only the host can start a round'; end if;
  if v_t.status != 'active'    then raise exception 'Tournament is not active'; end if;

  v_round_num := v_t.current_round + 1;
  if v_round_num > v_t.rounds_total then raise exception 'All rounds are already complete'; end if;

  -- Ensure previous round is finished before starting a new one
  if v_t.current_round > 0 then
    select bool_and(tp.result is not null) into v_prev_done
    from tournament_pairings tp
    join tournament_rounds   tr on tr.id = tp.round_id
    where tr.tournament_id = p_tournament_id
      and tr.round_number  = v_t.current_round;

    if not coalesce(v_prev_done, true) then
      raise exception 'Previous round still has unfinished games';
    end if;
  end if;

  -- Create round record and advance counter atomically
  insert into tournament_rounds (tournament_id, round_number)
  values (p_tournament_id, v_round_num)
  returning id into v_round_id;

  update tournaments set current_round = v_round_num where id = p_tournament_id;

  -- Process each pairing
  for v_pairing in select * from jsonb_array_elements(p_pairings) loop
    v_white_id := (v_pairing->>'white_id')::uuid;
    v_black_id := nullif(v_pairing->>'black_id', '')::uuid;

    if v_black_id is null then
      -- Bye: record immediately and award a full point
      insert into tournament_pairings (round_id, white_id, black_id, result)
      values (v_round_id, v_white_id, null, 'bye');

      update tournament_participants
        set score = score + 1
      where tournament_id = p_tournament_id and player_id = v_white_id;
    else
      -- Create game (starts as active — both players already agreed to the tournament)
      insert into games (
        white_id, black_id,
        board, turn, castling, status, move_history
      ) values (
        v_white_id, v_black_id,
        '[["r","n","b","q","k","b","n","r"],["p","p","p","p","p","p","p","p"],[null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null],["P","P","P","P","P","P","P","P"],["R","N","B","Q","K","B","N","R"]]',
        'white',
        '{"K":true,"Q":true,"k":true,"q":true}',
        'active',
        '[]'
      )
      returning id into v_game_id;

      insert into tournament_pairings (round_id, white_id, black_id, game_id)
      values (v_round_id, v_white_id, v_black_id, v_game_id);

      -- Track color balance for future color assignments
      update tournament_participants
        set color_balance = color_balance + 1
      where tournament_id = p_tournament_id and player_id = v_white_id;

      update tournament_participants
        set color_balance = color_balance - 1
      where tournament_id = p_tournament_id and player_id = v_black_id;
    end if;
  end loop;

  return v_round_id;
end;
$$;
revoke all on function create_tournament_round(uuid, jsonb) from public;
grant  execute on function create_tournament_round(uuid, jsonb) to authenticated;

-- ─── settle_tournament_game ──────────────────────────────────────────
-- Called by both clients after finalize_match. Idempotent.
-- Updates pairing result and awards points to the two participants.
create or replace function settle_tournament_game(p_game_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_pairing       tournament_pairings;
  v_game          games;
  v_tournament_id uuid;
begin
  select * into v_pairing from tournament_pairings where game_id = p_game_id;
  if not found then return; end if;           -- not a tournament game, no-op
  if v_pairing.result is not null then return; end if;  -- already settled

  select * into v_game from games where id = p_game_id;
  if v_game.status != 'finished' then
    raise exception 'Game is not finished yet';
  end if;

  select tr.tournament_id into v_tournament_id
  from tournament_rounds tr where tr.id = v_pairing.round_id;

  update tournament_pairings set result = v_game.winner where id = v_pairing.id;

  -- White player points
  update tournament_participants
    set score = score + case
      when v_game.winner = 'white' then 1.0
      when v_game.winner = 'draw'  then 0.5
      else 0.0
    end
  where tournament_id = v_tournament_id and player_id = v_pairing.white_id;

  -- Black player points
  update tournament_participants
    set score = score + case
      when v_game.winner = 'black' then 1.0
      when v_game.winner = 'draw'  then 0.5
      else 0.0
    end
  where tournament_id = v_tournament_id and player_id = v_pairing.black_id;
end;
$$;
revoke all on function settle_tournament_game(uuid) from public;
grant  execute on function settle_tournament_game(uuid) to authenticated;

-- ─── finish_tournament ───────────────────────────────────────────────
create or replace function finish_tournament(p_tournament_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_t tournaments; begin
  select * into v_t from tournaments where id = p_tournament_id;
  if not found then raise exception 'Tournament not found'; end if;
  if v_t.host_id != auth.uid() then raise exception 'Only the host can finish the tournament'; end if;
  update tournaments set status = 'finished' where id = p_tournament_id;
end;
$$;
revoke all on function finish_tournament(uuid) from public;
grant  execute on function finish_tournament(uuid) to authenticated;
