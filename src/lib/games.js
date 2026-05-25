import { INIT, INITIAL_CASTLING } from "../chess/board.js";
import { AI_ELO, applyResult } from "./elo.js";
import { supabase } from "./supabase.js";

// Create a new PvP game as the white player and return its row.
export async function createGame() {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) throw new Error("Not signed in");

  const { count: waitingCount } = await supabase
    .from("games")
    .select("id", { count: "exact", head: true })
    .eq("white_id", uid)
    .eq("status", "waiting");

  if (waitingCount > 0) {
    throw new Error("You already have an open challenge waiting for a player. Cancel it first.");
  }

  const { count: activeCount } = await supabase
    .from("games")
    .select("id", { count: "exact", head: true })
    .or(`white_id.eq.${uid},black_id.eq.${uid}`)
    .eq("status", "active");

  if (activeCount >= 5) {
    throw new Error("You already have 5 games in progress. Forfeit one to start a new one.");
  }

  const { data, error } = await supabase
    .from("games")
    .insert({
      white_id: uid,
      board: INIT,
      turn: "white",
      castling: INITIAL_CASTLING,
      status: "waiting",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Join a waiting game as the black player (via the join_game RPC for atomicity).
export async function joinGame(gameId) {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) throw new Error("Not signed in");

  const { count: activeCount } = await supabase
    .from("games")
    .select("id", { count: "exact", head: true })
    .or(`white_id.eq.${uid},black_id.eq.${uid}`)
    .eq("status", "active");

  if (activeCount >= 5) {
    throw new Error("You already have 5 games in progress. Forfeit one before joining a new one.");
  }

  const { data, error } = await supabase.rpc("join_game", { p_game_id: gameId });
  if (error) throw error;
  return data;
}

// Cancel a waiting game the current user created (no opponent yet, no ELO impact).
export async function cancelWaitingGame(gameId) {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) throw new Error("Not signed in");

  const { error } = await supabase
    .from("games")
    .update({ status: "abandoned" })
    .eq("id", gameId)
    .eq("white_id", uid)
    .eq("status", "waiting");

  if (error) throw error;
}

// Abandon an early active game (< 5 moves each) with no ELO impact for either player.
export async function abandonGame(gameId) {
  const { error } = await supabase.rpc("abandon_game", { p_game_id: gameId });
  if (error) throw error;
}

// Apply a move to a live PvP game. Caller has already computed the new state
// locally via simulateMove (so we pass the full next state in).
export async function submitMove(gameId, nextState, moveSAN, { status, winner } = {}) {
  const historyNext = [...(nextState.prevHistory ?? []), moveSAN];
  const { data, error } = await supabase.rpc("make_move", {
    p_game_id: gameId,
    p_board: nextState.board,
    p_en_passant: nextState.enPassant,
    p_castling: nextState.castling,
    p_move_history: historyNext,
    p_new_status: status ?? null,
    p_winner: winner ?? null,
  });
  if (error) throw error;
  return data;
}

// Called after a PvP game reaches a terminal state. Idempotent on the server —
// safe for both clients to call. Runs the ELO update + inserts a match row.
export async function finalizePvpMatch(gameId) {
  const { error } = await supabase.rpc("finalize_match", { p_game_id: gameId });
  if (error) throw error;
}

// Record an AI match result. Applies K=32 ELO vs the difficulty's fixed rating,
// updates win/loss/draw counters, and stores ELO before/after in the match row.
// Returns the player's ELO delta so the caller can show it in the overlay.
export async function recordAiMatch({ userId, result, difficulty, moves }) {
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("elo, wins, losses, draws")
    .eq("id", userId)
    .single();
  if (pErr) throw pErr;

  const aiElo = AI_ELO[difficulty] ?? AI_ELO.medium;
  // Player is always white in AI games; AI is black.
  // Draws don't affect ELO — a draw against a weaker AI shouldn't penalize the player.
  const { whiteElo: newElo, whiteDelta } =
    result === "draw"
      ? { whiteElo: profile.elo, whiteDelta: 0 }
      : applyResult(profile.elo, aiElo, result);

  const { error: uErr } = await supabase
    .from("profiles")
    .update({
      elo: newElo,
      wins: profile.wins + (result === "white" ? 1 : 0),
      losses: profile.losses + (result === "black" ? 1 : 0),
      draws: profile.draws + (result === "draw" ? 1 : 0),
    })
    .eq("id", userId);
  if (uErr) throw uErr;

  const { error: mErr } = await supabase.from("matches").insert({
    white_id: userId,
    black_id: null,
    ai_difficulty: difficulty,
    result,
    moves,
    white_elo_before: profile.elo,
    black_elo_before: aiElo,
    white_elo_after: newElo,
    black_elo_after: aiElo,
  });
  if (mErr) throw mErr;

  return whiteDelta;
}

// Fetches both the shared lobby (open challenges) and the current user's
// in-progress games. RLS does the heavy lifting — active games only come back
// for the two players involved, so we don't need a WHERE clause for that.
export async function listLobbyGames() {
  const select = `
    id, status, created_at, updated_at, white_id, black_id,
    white:white_id ( display_name, elo ),
    black:black_id ( display_name, elo )
  `;
  const [openRes, activeRes] = await Promise.all([
    supabase
      .from("games")
      .select(select)
      .eq("status", "waiting")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("games")
      .select(select)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(20),
  ]);
  if (openRes.error) throw openRes.error;
  if (activeRes.error) throw activeRes.error;
  return {
    open: openRes.data ?? [],
    inProgress: activeRes.data ?? [],
  };
}

export async function getGame(gameId) {
  const { data, error } = await supabase
    .from("games")
    .select("*, white:white_id ( display_name, elo ), black:black_id ( display_name, elo )")
    .eq("id", gameId)
    .single();
  if (error) throw error;
  return data;
}

export async function loadLeaderboard(limit = 50) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, elo, wins, losses, draws")
    .order("elo", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function submitFeedback({ body, category }) {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  const { error } = await supabase.from("feedback").insert({
    author_id: uid ?? null,
    body,
    category,
  });
  if (error) throw error;
}
