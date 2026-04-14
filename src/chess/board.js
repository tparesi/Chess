// Pure piece-type constants and board helpers. No visual/theme concerns here.
// Pieces are single-char strings: uppercase = white, lowercase = black.
// K=King, Q=Queen, R=Rook, B=Bishop, N=Knight, P=Pawn.

export const INIT = [
  ["r", "n", "b", "q", "k", "b", "n", "r"],
  ["p", "p", "p", "p", "p", "p", "p", "p"],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ["P", "P", "P", "P", "P", "P", "P", "P"],
  ["R", "N", "B", "Q", "K", "B", "N", "R"],
];

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export const INITIAL_CASTLING = { K: true, Q: true, k: true, q: true };

export const isWhite = (piece) => !!piece && piece === piece.toUpperCase();

export const colorOf = (piece) => (piece ? (isWhite(piece) ? "white" : "black") : null);

export const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

export const cloneBoard = (board) => board.map((row) => [...row]);

export function findKing(board, color) {
  const king = color === "white" ? "K" : "k";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === king) return [r, c];
    }
  }
  return null;
}

export function squareToAlgebraic(row, col) {
  return FILES[col] + (8 - row);
}

// Derive captured pieces from a live board by comparing against the starting
// position. Returns { white: [], black: [] } where white = pieces white has
// captured (lowercase letters = black pieces) and black = pieces black has
// captured (uppercase letters = white pieces) — same shape as the local state
// in AIGame. `Math.max(0, ...)` prevents promoted pieces from producing
// negative counts (a promoted queen shows as "the pawn was captured", which
// is semi-correct for display).
const INITIAL_PIECE_COUNTS = { Q: 1, R: 2, B: 2, N: 2, P: 8 };

export function computeCapturedFromBoard(board) {
  const whiteOnBoard = { Q: 0, R: 0, B: 0, N: 0, P: 0 };
  const blackOnBoard = { Q: 0, R: 0, B: 0, N: 0, P: 0 };
  for (const row of board) {
    for (const p of row) {
      if (!p) continue;
      const type = p.toUpperCase();
      if (type === "K") continue;
      if (isWhite(p)) whiteOnBoard[type] += 1;
      else blackOnBoard[type] += 1;
    }
  }
  const captured = { white: [], black: [] };
  for (const type of ["Q", "R", "B", "N", "P"]) {
    const whiteLost = Math.max(0, INITIAL_PIECE_COUNTS[type] - whiteOnBoard[type]);
    const blackLost = Math.max(0, INITIAL_PIECE_COUNTS[type] - blackOnBoard[type]);
    for (let i = 0; i < whiteLost; i++) captured.black.push(type);
    for (let i = 0; i < blackLost; i++) captured.white.push(type.toLowerCase());
  }
  return captured;
}
