# Slope Chess — Project rules for Claude

## Schema changes deploy through CI only

**Never run `supabase db push` directly** — the GitHub Action in
`.github/workflows/supabase-migrate.yml` is the only thing that should
apply migrations to the hosted project. It runs automatically on every
push to `main` that touches `supabase/migrations/**` or `supabase/config.toml`.

**Never run `supabase migration up` without asking first, and always pass
`--local` explicitly when the user approves a local-only run.** The CLI
defaults to local, but the `--linked` flag routes to hosted prod — don't
rely on the default. Always make the target explicit. Even local schema
changes should be a deliberate user choice, not a silent side effect of
an implementation pass.

**Why:** changing production schema out-of-band from the code that uses it
can break production. The CI pipeline guarantees schema + app code deploy
together.

**The workflow:**
1. Write or edit a file under `supabase/migrations/`
2. Commit and push alongside the code that uses it
3. GitHub Action applies to the hosted DB
4. Vercel deploys the frontend
5. Both land at roughly the same time

**If I need to test against the new schema locally**, I'll say so and ask
the user to run `supabase migration up` themselves, or run it with their
explicit go-ahead.

**Manual emergency override:** if something is broken in prod and needs
a schema fix faster than a push/CI cycle, I'll explicitly ask before
running any `supabase db push` or similar, name exactly what I'm about to
run, and wait for "yes".

## General caution list

The following commands should never be run without explicit user approval:

- `supabase db push` — touches hosted prod DB
- `supabase db reset` — wipes a DB and re-applies migrations
- `supabase stop` — stops containers; may interrupt other projects
- `vercel --prod` — triggers a manual prod deploy outside the git flow
- `gh secret set`, `gh secret delete` — modifies repo secrets
- `gh repo delete`, `gh repo archive` — destructive repo ops
- `git push --force`, `git reset --hard` — overwrites history or local work
- Any destructive SQL (`drop`, `truncate`, `delete from` without `where`)

These are in addition to the standard Claude Code safety rules around
force-push, reset-hard, and file deletion.
