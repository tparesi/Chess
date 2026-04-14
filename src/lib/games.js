import { INIT, INITIAL_CASTLING } from "../chess/board.js";
import { supabase } from "./supabase.js";

// Create a new PvP game as the white player and return its row.
export async function createGame() {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) throw new Error("Not signed in");

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
  const { data, error } = await supabase.rpc("join_game", { p_game_id: gameId });
  if (error) throw error;
  return data;
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

// Record an AI match result. Updates win/loss counters but does not touch ELO.
export async function recordAiMatch({ userId, result, difficulty, moves }) {
  const updates = {
    wins: result === "white" ? 1 : 0,
    losses: result === "black" ? 1 : 0,
    draws: result === "draw" ? 1 : 0,
  };

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("wins, losses, draws")
    .eq("id", userId)
    .single();
  if (pErr) throw pErr;

  const { error: uErr } = await supabase
    .from("profiles")
    .update({
      wins: profile.wins + updates.wins,
      losses: profile.losses + updates.losses,
      draws: profile.draws + updates.draws,
    })
    .eq("id", userId);
  if (uErr) throw uErr;

  const { error: mErr } = await supabase.from("matches").insert({
    white_id: userId,
    black_id: null,
    ai_difficulty: difficulty,
    result,
    moves,
  });
  if (mErr) throw mErr;
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
