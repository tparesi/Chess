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
