# Chess

A chess game built for my kid's class — real-time online PvP, ELO ratings, training puzzles, and an AI opponent. The kids can play each other at school and ask for new features each week.

## Quick start

```bash
npm install
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project
npm run dev
```

Open http://localhost:5173.

## First-time setup (one-time)

1. Create a free project at https://supabase.com
2. In the Supabase SQL editor, paste and run `supabase/schema.sql`
3. In project settings → API, copy the **Project URL** and **anon public key** into `.env.local`
4. `npm install && npm run dev`

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
  schema.sql    # DB schema — paste into Supabase SQL editor
tests/
  chess/        # Vitest suite for the engine
```

## Feedback

Kids can submit feedback via the in-app form. Submissions land in the `feedback` table in Supabase — query it there directly.
