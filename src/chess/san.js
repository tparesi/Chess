// Standard Algebraic Notation (SAN) move formatting.
// Given a pre-move board + the move, produces strings like:
//   e4, Nf3, Nxf3, exd5, O-O, O-O-O, e8=Q, Nbd2, Qh7#, Rxe1+

import { FILES, colorOf, isWhite } from "./board.js";
import { hasLegalMove, isInCheck, legalMoves, simulateMove } from "./moves.js";

// Finds other same-type/same-color pieces on the board that could also
// legally move to `to`. Used to decide whether disambiguation is needed.
function findDisambiguationCandidates(board, fromR, fromC, to, piece, enPassant, castling) {
  const others = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (r === fromR && c === fromC) continue;
      if (board[r][c] !== piece) continue;
      const moves = legalMoves(board, r, c, enPassant, castling);
      if (moves.some(([tr, tc]) => tr === to[0] && tc === to[1])) {
        others.push([r, c]);
      }
    }
  }
  return others;
}

// SAN disambiguation rules:
//   1. If no other same-type piece can reach the square → no disambiguator
//   2. If files of the candidates are distinct from the mover's file → use file
//   3. Else if ranks are distinct → use rank
//   4. Else → use full algebraic square (file + rank)
function disambiguate(board, fromR, fromC, to, piece, enPassant, castling) {
  const others = findDisambiguationCandidates(board, fromR, fromC, to, piece, enPassant, castling);
  if (others.length === 0) return "";
  const sameFile = others.some(([, c]) => c === fromC);
  const sameRank = others.some(([r]) => r === fromR);
  if (!sameFile) return FILES[fromC];
  if (!sameRank) return String(8 - fromR);
  return FILES[fromC] + String(8 - fromR);
}

/**
 * Format a move in SAN.
 *
 * @param {string[][]} board - the board BEFORE the move
 * @param {[number, number]} from - [row, col]
 * @param {[number, number]} to - [row, col]
 * @param {Object} state - { enPassant, castling }
 * @param {string|null} promotion - "Q"|"R"|"B"|"N" if pawn promotes, null otherwise
 * @returns {string} SAN move string
 */
export function moveToSAN(board, from, to, { enPassant, castling }, promotion = null) {
  const [fr, fc] = from;
  const [tr, tc] = to;
  const piece = board[fr][fc];
  if (!piece) return "";
  const type = piece.toUpperCase();
  const color = colorOf(piece);

  // Castling
  if (type === "K" && Math.abs(tc - fc) === 2) {
    const base = tc === 6 ? "O-O" : "O-O-O";
    return base + suffixForCheckMate(board, from, to, { enPassant, castling }, promotion);
  }

  // Detect capture (regular OR en passant)
  const isEnPassant =
    type === "P" && enPassant && tr === enPassant[0] && tc === enPassant[1];
  const isCapture = board[tr][tc] != null || isEnPassant;

  let san = "";

  if (type === "P") {
    if (isCapture) {
      san = FILES[fc] + "x" + FILES[tc] + (8 - tr);
    } else {
      san = FILES[tc] + (8 - tr);
    }
    if (promotion) san += "=" + promotion.toUpperCase();
  } else {
    san = type;
    san += disambiguate(board, fr, fc, to, piece, enPassant, castling);
    if (isCapture) san += "x";
    san += FILES[tc] + (8 - tr);
  }

  return san + suffixForCheckMate(board, from, to, { enPassant, castling }, promotion);
}

// Simulates the move and returns "+" for check, "#" for mate, "" otherwise.
function suffixForCheckMate(board, from, to, { enPassant, castling }, promotion) {
  const sim = simulateMove(board, from, to, enPassant, castling);
  // simulateMove auto-queens pawns; override for under-promotion
  if (promotion && promotion !== "Q") {
    const piece = board[from[0]][from[1]];
    const promoted = isWhite(piece) ? promotion.toUpperCase() : promotion.toLowerCase();
    sim.board[to[0]][to[1]] = promoted;
  }
  const mover = board[from[0]][from[1]];
  const nextColor = isWhite(mover) ? "black" : "white";
  if (!isInCheck(sim.board, nextColor)) return "";
  const hasMove = hasLegalMove(sim.board, nextColor, sim.enPassant, sim.castling);
  return hasMove ? "+" : "#";
}
