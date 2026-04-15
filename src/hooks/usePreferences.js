import { useCallback, useEffect, useState } from "react";

// Tiny localStorage-backed preferences hook. For v1 the only pref is
// `coachEnabled` — we deliberately keep this out of Supabase so this
// feature doesn't require a migration. Prefs move to profiles.preferences
// later if cross-device sync matters.

const KEY = "slope-chess-prefs";
const DEFAULTS = {
  coachEnabled: true,
};

function readPrefs() {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function writePrefs(prefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // quota exceeded / blocked — ignore
  }
}

export function usePreferences() {
  const [prefs, setPrefs] = useState(() => readPrefs());

  // Cross-tab sync via the storage event. If the user opens two tabs and
  // toggles the pref in one, the other updates in place.
  useEffect(() => {
    const handler = (e) => {
      if (e.key === KEY) setPrefs(readPrefs());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setPref = useCallback((key, value) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      writePrefs(next);
      return next;
    });
  }, []);

  return { prefs, setPref };
}
