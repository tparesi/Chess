# Chess

A chess game built for my kid's class — real-time online PvP, ELO ratings, training puzzles, and an AI opponent. The kids can play each other at school and ask for new features each week.

## Quick start (local Supabase)

Runs the whole stack — app + Postgres + Auth + Realtime — on your laptop, no cloud account needed. Requires Docker running.

```bash
npm install
supabase start                  # spins up local Postgres/Auth/Realtime (first run pulls images)
```

`supabase start` prints a **Project URL** and **Publishable key**. Copy them into `.env.local`:

```bash
cp .env.example .env.local
# edit .env.local with the values supabase start printed
npm run dev
```

Open http://localhost:5173.

The local stack uses non-default ports so it can run alongside other supabase projects:
- API: http://127.0.0.1:55321
- Postgres: `postgresql://postgres:postgres@127.0.0.1:55322/postgres`
- Studio: http://127.0.0.1:55323
- Mailpit (fake email inbox): http://127.0.0.1:55324

To stop: `supabase stop`. To reset the DB and re-run migrations: `supabase db reset`.

## Deploying to hosted Supabase + Vercel

When you're ready to put it online:

1. Create a free project at https://supabase.com
2. Link it: `supabase link --project-ref YOUR_REF`
3. Push migrations: `supabase db push`
4. Import the repo at https://vercel.com and add the two env vars:
   - `VITE_SUPABASE_URL` — the hosted project URL
   - `VITE_SUPABASE_ANON_KEY` — the project's anon/publishable key

## Deploying

Pushes to `main` auto-deploy via Vercel. To set up:

1. Import the repo at https://vercel.com
2. Add the same two env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
3. Deploy

## Adding a new piece theme

Themes live in `src/themes/`. Each theme is a plain JS object — copy `src/themes/classic.js`, rename it, change the emoji/glyphs, then register it in `src/themes/index.js`. No component changes needed.

```js
// src/themes/minecraft.js
export const minecraft = {
  id: "minecraft",
  name: "Minecraft",
  pieces: { K: "👑", Q: "💎", R: "🏰", B: "🧙", N: "🐴", P: "🧱", /* ...lowercase = black */ },
  labels: { K: "King", Q: "Queen", R: "Tower", B: "Wizard", N: "Horse", P: "Block" },
  boardColors: { light: "#e5d2a9", dark: "#6b4a2b" },
  sideNames: { white: "Overworld", black: "Nether" },
};
```

## Running tests

```bash
npm test          # one-shot
npm run test:watch
```

## Project structure

```
src/
  chess/        # rules engine — pure JS, no React
  themes/       # piece sets (add new ones here)
  components/   # React components
  lib/          # Supabase client, ELO math, game helpers
  hooks/        # useAuth, useProfile
  styles/       # global.css
supabase/
  config.toml       # local Supabase CLI config
  migrations/       # SQL migrations, applied automatically on `supabase start`
tests/
  chess/        # Vitest suite for the engine
```

## Feedback

Kids can submit feedback via the in-app form. Submissions land in the `feedback` table in Supabase — query it there directly.
