import { supabase } from "./supabase.js";

// ─── API wrappers ────────────────────────────────────────────────────

export async function listTournaments() {
  const { data, error } = await supabase
    .from("tournaments")
    .select(`
      id, name, status, rounds_total, current_round, host_id, created_at,
      host:host_id ( display_name )
    `)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function getTournament(id) {
  const { data, error } = await supabase
    .from("tournaments")
    .select(`
      id, name, status, rounds_total, current_round, host_id, created_at,
      host:host_id ( display_name ),
      tournament_participants (
        player_id, score, color_balance,
        player:player_id ( display_name, elo )
      ),
      tournament_rounds (
        id, round_number,
        tournament_pairings (
          id, white_id, black_id, game_id, result,
          white:white_id ( display_name, elo ),
          black:black_id ( display_name, elo )
        )
      )
    `)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createTournament({ name, roundsTotal }) {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) throw new Error("Not signed in");

  // Host is automatically a participant
  const { data, error } = await supabase
    .from("tournaments")
    .insert({ name, host_id: uid, rounds_total: roundsTotal })
    .select()
    .single();
  if (error) throw error;

  // Add host as first participant
  await supabase
    .from("tournament_participants")
    .insert({ tournament_id: data.id, player_id: uid });

  return data;
}

export async function joinTournament(tournamentId) {
  const { error } = await supabase.rpc("join_tournament", {
    p_tournament_id: tournamentId,
  });
  if (error) throw error;
}

export async function startTournament(tournamentId) {
  const { error } = await supabase.rpc("start_tournament", {
    p_tournament_id: tournamentId,
  });
  if (error) throw error;
}

export async function createTournamentRound(tournamentId, pairings) {
  // pairings: [{whiteId, blackId}] where blackId may be null (bye)
  const mapped = pairings.map((p) => ({
    white_id: p.whiteId,
    black_id: p.blackId ?? null,
  }));
  const { data, error } = await supabase.rpc("create_tournament_round", {
    p_tournament_id: tournamentId,
    p_pairings: mapped,
  });
  if (error) throw error;
  return data; // round_id
}

export async function settleTournamentGame(gameId) {
  const { error } = await supabase.rpc("settle_tournament_game", {
    p_game_id: gameId,
  });
  if (error) throw error;
}

export async function finishTournament(tournamentId) {
  const { error } = await supabase.rpc("finish_tournament", {
    p_tournament_id: tournamentId,
  });
  if (error) throw error;
}

// Check if a game is part of a tournament pairing and return the pairing, or null.
export async function getTournamentPairing(gameId) {
  const { data, error } = await supabase
    .from("tournament_pairings")
    .select("id, round_id, white_id, black_id, result, tournament_rounds(tournament_id)")
    .eq("game_id", gameId)
    .maybeSingle();
  if (error) throw error;
  return data; // null if not a tournament game
}

// ─── Swiss pairing algorithm ────────────────────────────────────────
// participants: [{playerId, score, elo, colorBalance}]
// history:      [{whiteId, blackId}] (all previous pairings this tournament)
// roundNumber:  1-indexed
// Returns:      [{whiteId, blackId}] where blackId null = bye
export function computeSwissPairings(participants, history, roundNumber) {
  // Build previous-opponent sets for no-rematch rule
  const prevOpponents = {};
  for (const p of participants) prevOpponents[p.playerId] = new Set();
  for (const pair of history) {
    if (pair.blackId) {
      prevOpponents[pair.whiteId]?.add(pair.blackId);
      prevOpponents[pair.blackId]?.add(pair.whiteId);
    }
  }

  // Sort order
  const sorted = [...participants].sort((a, b) => {
    if (roundNumber === 1) {
      // Round 1: pair by ELO (top half vs bottom half)
      return b.elo - a.elo || a.playerId.localeCompare(b.playerId);
    }
    // Later rounds: score desc, ELO desc as tiebreaker
    return b.score - a.score || b.elo - a.elo || a.playerId.localeCompare(b.playerId);
  });

  const pairings = [];
  const paired = new Set();

  if (roundNumber === 1) {
    // Cross-pair: player[i] vs player[mid + i]
    const mid = Math.floor(sorted.length / 2);
    for (let i = 0; i < mid; i++) {
      const a = sorted[i];
      const b = sorted[mid + i];
      const [white, black] = assignColors(a, b);
      pairings.push({ whiteId: white.playerId, blackId: black.playerId });
      paired.add(a.playerId);
      paired.add(b.playerId);
    }
    if (sorted.length % 2 === 1) {
      // Bottom player gets a bye
      pairings.push({ whiteId: sorted[sorted.length - 1].playerId, blackId: null });
    }
  } else {
    // Greedy: pair adjacent players with no-rematch check
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i];
      if (paired.has(a.playerId)) continue;

      let matched = false;
      for (let j = i + 1; j < sorted.length; j++) {
        const b = sorted[j];
        if (paired.has(b.playerId)) continue;
        if (prevOpponents[a.playerId]?.has(b.playerId)) continue;

        const [white, black] = assignColors(a, b);
        pairings.push({ whiteId: white.playerId, blackId: black.playerId });
        paired.add(a.playerId);
        paired.add(b.playerId);
        matched = true;
        break;
      }

      if (!matched) {
        // Last resort: pair with a previous opponent (better than a bye)
        for (let j = i + 1; j < sorted.length; j++) {
          const b = sorted[j];
          if (paired.has(b.playerId)) continue;
          const [white, black] = assignColors(a, b);
          pairings.push({ whiteId: white.playerId, blackId: black.playerId });
          paired.add(a.playerId);
          paired.add(b.playerId);
          matched = true;
          break;
        }
      }

      if (!matched) {
        pairings.push({ whiteId: a.playerId, blackId: null });
        paired.add(a.playerId);
      }
    }
  }

  return pairings;
}

// Assign colors to balance each player's color history.
// Returns [whiteSide, blackSide] as participant objects.
function assignColors(a, b) {
  // Lower colorBalance → has had more blacks → give them white
  if (a.colorBalance < b.colorBalance) return [a, b];
  if (b.colorBalance < a.colorBalance) return [b, a];
  // Tied: give white to the lower-ELO player (slight balance mechanism)
  return a.elo <= b.elo ? [a, b] : [b, a];
}

// Derive full pairing history from a loaded tournament object (for use in
// computeSwissPairings). Filters out byes (blackId null).
export function extractPairingHistory(tournament) {
  const history = [];
  for (const round of tournament.tournament_rounds ?? []) {
    for (const p of round.tournament_pairings ?? []) {
      if (p.black_id) {
        history.push({ whiteId: p.white_id, blackId: p.black_id });
      }
    }
  }
  return history;
}

// Build the participant array expected by computeSwissPairings from a loaded tournament.
export function extractParticipants(tournament) {
  return (tournament.tournament_participants ?? []).map((tp) => ({
    playerId: tp.player_id,
    score: tp.score,
    elo: tp.player?.elo ?? 1000,
    colorBalance: tp.color_balance,
    displayName: tp.player?.display_name ?? "Unknown",
  }));
}

// Returns true if every pairing in the current round has a result.
export function currentRoundComplete(tournament) {
  if (tournament.current_round === 0) return false;
  const round = (tournament.tournament_rounds ?? []).find(
    (r) => r.round_number === tournament.current_round
  );
  if (!round) return false;
  return round.tournament_pairings.every((p) => p.result != null);
}
