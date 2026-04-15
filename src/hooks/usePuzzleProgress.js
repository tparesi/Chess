import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

// Loads the current user's puzzle_progress rows and exposes helpers to mark
// a puzzle solved (with or without help). The server holds the authoritative
// state; this hook just caches it locally and keeps the cache fresh on writes.
//
// Shape returned:
//   { loading, solvedIds: Set<string>, solvedWithHelpIds: Set<string>,
//     markSolved(puzzleId, attempts), markSolvedWithHelp(puzzleId, attempts),
//     reload() }
export function usePuzzleProgress(userId) {
  const [loading, setLoading] = useState(true);
  const [solvedIds, setSolvedIds] = useState(() => new Set());
  const [solvedWithHelpIds, setSolvedWithHelpIds] = useState(() => new Set());

  const load = useCallback(async () => {
    if (!userId) {
      setSolvedIds(new Set());
      setSolvedWithHelpIds(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("puzzle_progress")
      .select("puzzle_id, solved_with_help")
      .eq("user_id", userId);
    if (error) {
      console.error("[usePuzzleProgress]", error);
      setLoading(false);
      return;
    }
    const solved = new Set();
    const withHelp = new Set();
    for (const row of data ?? []) {
      solved.add(row.puzzle_id);
      if (row.solved_with_help) withHelp.add(row.puzzle_id);
    }
    setSolvedIds(solved);
    setSolvedWithHelpIds(withHelp);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const writeProgress = useCallback(
    async (puzzleId, { solvedWithHelp, attempts }) => {
      if (!userId) return;
      // Optimistic local update
      setSolvedIds((prev) => {
        const next = new Set(prev);
        next.add(puzzleId);
        return next;
      });
      if (solvedWithHelp) {
        setSolvedWithHelpIds((prev) => {
          const next = new Set(prev);
          next.add(puzzleId);
          return next;
        });
      }

      const { error } = await supabase.from("puzzle_progress").upsert(
        {
          user_id: userId,
          puzzle_id: puzzleId,
          solved_with_help: !!solvedWithHelp,
          attempts: attempts ?? 1,
          solved_at: new Date().toISOString(),
        },
        { onConflict: "user_id,puzzle_id" }
      );
      if (error) {
        console.error("[usePuzzleProgress] upsert", error);
        // Roll back the optimistic update on write failure
        setSolvedIds((prev) => {
          const next = new Set(prev);
          next.delete(puzzleId);
          return next;
        });
        if (solvedWithHelp) {
          setSolvedWithHelpIds((prev) => {
            const next = new Set(prev);
            next.delete(puzzleId);
            return next;
          });
        }
      }
    },
    [userId]
  );

  const markSolved = useCallback(
    (puzzleId, attempts = 1) =>
      writeProgress(puzzleId, { solvedWithHelp: false, attempts }),
    [writeProgress]
  );
  const markSolvedWithHelp = useCallback(
    (puzzleId, attempts = 3) =>
      writeProgress(puzzleId, { solvedWithHelp: true, attempts }),
    [writeProgress]
  );

  return {
    loading,
    solvedIds,
    solvedWithHelpIds,
    markSolved,
    markSolvedWithHelp,
    reload: load,
  };
}

// Given the static puzzle list and the set of solved ids, returns the
// index of the first unsolved puzzle. If all puzzles are solved, returns
// the length of the list (meaning "you're done").
export function firstUnsolvedIndex(puzzles, solvedIds) {
  for (let i = 0; i < puzzles.length; i++) {
    if (!solvedIds.has(puzzles[i].id)) return i;
  }
  return puzzles.length;
}
