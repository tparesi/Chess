-- Ensure the games table is fully ready for Supabase Realtime.
-- Idempotent: safe to re-run.

-- REPLICA IDENTITY FULL ensures UPDATE/DELETE events include the full old row,
-- which Realtime needs to run RLS filtering against the previous state.
alter table public.games replica identity full;

-- Make sure the table is still in the realtime publication. `alter publication
-- add table` is NOT idempotent on its own (it errors if the table is already
-- added), so guard it.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'games'
  ) then
    alter publication supabase_realtime add table public.games;
  end if;
end
$$;
