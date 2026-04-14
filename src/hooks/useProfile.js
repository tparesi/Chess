import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export function useProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, elo, wins, losses, draws")
      .eq("id", userId)
      .single();
    if (error) console.error("[useProfile]", error);
    setProfile(data ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { profile, loading, reload: load };
}
