import { isWhite } from "./board.js";
import { allLegalMoves, isInCheck, simulateMove } from "./moves.js";

export const PIECE_VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

// Piece-square tables: positional bonuses by board index, white-perspective.
// Flipped for black via (7 - r) * 8 + c.
export const PIECE_SQUARE_TABLES = {
  P: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  N: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  B: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  R: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ],
  Q: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  K: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

export function evaluate(board) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const type = piece.toUpperCase();
      const idx = isWhite(piece) ? r * 8 + c : (7 - r) * 8 + c;
      const value = PIECE_VALUES[type] + (PIECE_SQUARE_TABLES[type]?.[idx] || 0);
      score += isWhite(piece) ? value : -value;
    }
  }
  return score;
}

function minimax(board, depth, alpha, beta, maximizing, enPassant, castling) {
  if (depth === 0) return evaluate(board);
  const color = maximizing ? "white" : "black";
  const moves = allLegalMoves(board, color, enPassant, castling);
  if (!moves.length) {
    if (isInCheck(board, color)) return maximizing ? -99999 + (4 - depth) : 99999 - (4 - depth);
    return 0;
  }
  moves.sort((a, b) => {
    const va = board[a.to[0]][a.to[1]] ? PIECE_VALUES[board[a.to[0]][a.to[1]].toUpperCase()] : 0;
    const vb = board[b.to[0]][b.to[1]] ? PIECE_VALUES[board[b.to[0]][b.to[1]].toUpperCase()] : 0;
    return vb - va;
  });
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      const sim = simulateMove(board, m.from, m.to, enPassant, castling);
      best = Math.max(best, minimax(sim.board, depth - 1, alpha, beta, false, sim.enPassant, sim.castling));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const sim = simulateMove(board, m.from, m.to, enPassant, castling);
      best = Math.min(best, minimax(sim.board, depth - 1, alpha, beta, true, sim.enPassant, sim.castling));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

export function aiMove(board, difficulty, enPassant, castling) {
  const moves = allLegalMoves(board, "black", enPassant, castling);
  if (!moves.length) return null;

  if (difficulty === "easy") {
    const captures = moves.filter((m) => board[m.to[0]][m.to[1]]);
    if (captures.length && Math.random() < 0.35) {
      return captures[Math.floor(Math.random() * captures.length)];
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = difficulty === "medium" ? 2 : 3;
  let best = moves[0];
  let bestEval = Infinity;
  for (const m of moves) {
    const sim = simulateMove(board, m.from, m.to, enPassant, castling);
    const score = minimax(sim.board, depth - 1, -Infinity, Infinity, true, sim.enPassant, sim.castling);
    if (score < bestEval) {
      bestEval = score;
      best = m;
    }
  }
  return best;
}
