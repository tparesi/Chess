-- Chess app schema.
-- Paste and run this in the Supabase SQL editor.
-- Safe to re-run: all creates are idempotent where possible.

-- ─── profiles ───────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  elo int not null default 1000,
  wins int not null default 0,
  losses int not null default 0,
  draws int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists profiles_elo_idx on profiles (elo desc);

-- Auto-create a profile row when a user signs up.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── games (live PvP) ───────────────────────────────────────────────
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  white_id uuid not null references profiles(id),
  black_id uuid references profiles(id),
  status text not null default 'waiting',
  board jsonb not null,
  turn text not null default 'white',
  en_passant jsonb,
  castling jsonb not null default '{"K":true,"Q":true,"k":true,"q":true}',
  move_history jsonb not null default '[]',
  winner text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('waiting', 'active', 'finished', 'abandoned')),
  check (turn in ('white', 'black')),
  check (winner is null or winner in ('white', 'black', 'draw'))
);

create index if not exists games_status_idx on games (status);
create index if not exists games_white_idx on games (white_id);
create index if not exists games_black_idx on games (black_id);

-- ─── matches (archive + leaderboard source) ─────────────────────────
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  game_id uuid unique references games(id) on delete set null,
  white_id uuid not null references profiles(id),
  black_id uuid references profiles(id),
  ai_difficulty text,
  result text not null,
  white_elo_before int,
  black_elo_before int,
  white_elo_after int,
  black_elo_after int,
  moves jsonb,
  played_at timestamptz not null default now(),
  check (result in ('white', 'black', 'draw')),
  check (ai_difficulty is null or ai_difficulty in ('easy', 'medium', 'hard'))
);

create index if not exists matches_played_at_idx on matches (played_at desc);

-- ─── feedback ───────────────────────────────────────────────────────
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id) on delete set null,
  body text not null,
  category text,
  created_at timestamptz not null default now(),
  check (category is null or category in ('feature', 'bug', 'other'))
);

-- ─── Row-Level Security ─────────────────────────────────────────────
alter table profiles enable row level security;
alter table games enable row level security;
alter table matches enable row level security;
alter table feedback enable row level security;

drop policy if exists "profiles: authed users can read" on profiles;
create policy "profiles: authed users can read" on profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "profiles: users update own" on profiles;
create policy "profiles: users update own" on profiles
  for update using (auth.uid() = id);

drop policy if exists "games: lobby + participants read" on games;
create policy "games: lobby + participants read" on games
  for select using (
    status = 'waiting' or auth.uid() = white_id or auth.uid() = black_id
  );

drop policy if exists "games: white creates" on games;
create policy "games: white creates" on games
  for insert with check (auth.uid() = white_id);

drop policy if exists "games: participants update" on games;
create policy "games: participants update" on games
  for update using (auth.uid() = white_id or auth.uid() = black_id);

drop policy if exists "matches: authed read" on matches;
create policy "matches: authed read" on matches
  for select using (auth.role() = 'authenticated');

drop policy if exists "matches: player inserts own" on matches;
create policy "matches: player inserts own" on matches
  for insert with check (auth.uid() = white_id or auth.uid() = black_id);

drop policy if exists "feedback: authed insert" on feedback;
create policy "feedback: authed insert" on feedback
  for insert with check (auth.uid() = author_id);

-- ─── RPCs ───────────────────────────────────────────────────────────

-- Join a waiting game as the black player. Atomic so two kids can't race.
create or replace function join_game(p_game_id uuid) returns games
language plpgsql security definer set search_path = public as $$
declare
  v_game games;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into v_game from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if v_game.status <> 'waiting' then raise exception 'game not available'; end if;
  if v_game.white_id = v_uid then raise exception 'cannot join your own game'; end if;

  update games set
    black_id = v_uid,
    status = 'active',
    updated_at = now()
  where id = p_game_id
  returning * into v_game;

  return v_game;
end;
$$;

revoke all on function join_game(uuid) from public;
grant execute on function join_game(uuid) to authenticated;

-- Apply a move. The client computes the new board state locally and passes it
-- in. We only enforce turn order + participant identity — the board itself is
-- trusted. Motivated cheating via devtools is out of scope for a classroom.
create or replace function make_move(
  p_game_id uuid,
  p_board jsonb,
  p_en_passant jsonb,
  p_castling jsonb,
  p_move_history jsonb,
  p_new_status text default null,
  p_winner text default null
) returns games
language plpgsql security definer set search_path = public as $$
declare
  v_game games;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into v_game from games where id = p_game_id for update;
  if not found then raise exception 'game not found'; end if;
  if v_game.status <> 'active' then raise exception 'game not active'; end if;

  if v_game.turn = 'white' and v_game.white_id <> v_uid then
    raise exception 'not your turn';
  end if;
  if v_game.turn = 'black' and v_game.black_id <> v_uid then
    raise exception 'not your turn';
  end if;

  update games set
    board = p_board,
    en_passant = p_en_passant,
    castling = p_castling,
    move_history = p_move_history,
    turn = case when turn = 'white' then 'black' else 'white' end,
    status = coalesce(p_new_status, status),
    winner = coalesce(p_winner, winner),
    updated_at = now()
  where id = p_game_id
  returning * into v_game;

  return v_game;
end;
$$;

revoke all on function make_move(uuid, jsonb, jsonb, jsonb, jsonb, text, text) from public;
grant execute on function make_move(uuid, jsonb, jsonb, jsonb, jsonb, text, text) to authenticated;

-- Finalize a finished PvP game: insert a match row + update both profiles' ELO.
-- Idempotent via the unique constraint on matches.game_id.
create or replace function finalize_match(p_game_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_game games;
  v_white profiles;
  v_black profiles;
  v_we float;
  v_be float;
  v_wa float;
  v_ba float;
  v_w_new int;
  v_b_new int;
  v_existing int;
  v_k constant int := 32;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select * into v_game from games where id = p_game_id;
  if not found then raise exception 'game not found'; end if;
  if v_game.status <> 'finished' then raise exception 'game not finished'; end if;
  if v_game.black_id is null then raise exception 'game has no black player'; end if;
  if v_game.winner is null then raise exception 'game has no winner'; end if;

  select count(*) into v_existing from matches where game_id = p_game_id;
  if v_existing > 0 then return; end if;

  select * into v_white from profiles where id = v_game.white_id;
  select * into v_black from profiles where id = v_game.black_id;

  v_we := 1.0 / (1 + power(10, (v_black.elo - v_white.elo)::float / 400));
  v_be := 1.0 / (1 + power(10, (v_white.elo - v_black.elo)::float / 400));

  if v_game.winner = 'white' then
    v_wa := 1; v_ba := 0;
  elsif v_game.winner = 'black' then
    v_wa := 0; v_ba := 1;
  else
    v_wa := 0.5; v_ba := 0.5;
  end if;

  v_w_new := v_white.elo + round(v_k * (v_wa - v_we));
  v_b_new := v_black.elo + round(v_k * (v_ba - v_be));

  insert into matches (
    game_id, white_id, black_id, result,
    white_elo_before, black_elo_before,
    white_elo_after, black_elo_after,
    moves
  ) values (
    p_game_id, v_game.white_id, v_game.black_id, v_game.winner,
    v_white.elo, v_black.elo,
    v_w_new, v_b_new,
    v_game.move_history
  );

  update profiles set
    elo = v_w_new,
    wins  = wins  + (case when v_game.winner = 'white' then 1 else 0 end),
    losses = losses + (case when v_game.winner = 'black' then 1 else 0 end),
    draws  = draws  + (case when v_game.winner = 'draw'  then 1 else 0 end)
  where id = v_game.white_id;

  update profiles set
    elo = v_b_new,
    wins  = wins  + (case when v_game.winner = 'black' then 1 else 0 end),
    losses = losses + (case when v_game.winner = 'white' then 1 else 0 end),
    draws  = draws  + (case when v_game.winner = 'draw'  then 1 else 0 end)
  where id = v_game.black_id;
end;
$$;

revoke all on function finalize_match(uuid) from public;
grant execute on function finalize_match(uuid) to authenticated;

-- ─── Realtime ───────────────────────────────────────────────────────
-- Enable Realtime on games so clients can subscribe to row updates.
-- (Also must be toggled on in the Supabase dashboard Realtime tab.)
alter publication supabase_realtime add table games;
