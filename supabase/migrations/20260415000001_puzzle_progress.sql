-- Tracks how far each user has progressed through the curated puzzle book.
-- Puzzle content itself lives in src/puzzles/data.json (static bundle); this
-- table only stores WHO has solved WHICH puzzle and how.

create table if not exists puzzle_progress (
  user_id uuid not null references profiles(id) on delete cascade,
  puzzle_id text not null,
  solved_at timestamptz not null default now(),
  attempts int not null default 1,
  solved_with_help boolean not null default false,
  primary key (user_id, puzzle_id)
);

create index if not exists puzzle_progress_user_idx on puzzle_progress (user_id);
create index if not exists puzzle_progress_solved_at_idx on puzzle_progress (solved_at desc);

alter table puzzle_progress enable row level security;

drop policy if exists "puzzle_progress: own rows readable" on puzzle_progress;
create policy "puzzle_progress: own rows readable" on puzzle_progress
  for select using (auth.uid() = user_id);

drop policy if exists "puzzle_progress: own rows insertable" on puzzle_progress;
create policy "puzzle_progress: own rows insertable" on puzzle_progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "puzzle_progress: own rows updatable" on puzzle_progress;
create policy "puzzle_progress: own rows updatable" on puzzle_progress
  for update using (auth.uid() = user_id);
