import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.warn(
    "[chess] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env.local and fill in your Supabase project values."
  );
}

export const supabase = createClient(url ?? "http://localhost", anon ?? "public-anon-key", {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const hasSupabaseConfig = Boolean(url && anon);
