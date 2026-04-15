// UCI (Universal Chess Interface) move notation.
// "e2e4"      → pawn from e2 to e4
// "g1f3"      → knight from g1 to f3
// "e7e8q"     → pawn promotion to queen
// "a7a8n"     → pawn under-promotion to knight
//
// Used because the Lichess puzzle database ships solutions in UCI.

import { FILES } from "./board.js";

export function parseUCI(uci) {
  if (!uci || typeof uci !== "string" || uci.length < 4 || uci.length > 5) {
    throw new Error(`parseUCI: expected a 4- or 5-char UCI string, got "${uci}"`);
  }
  const from = squareToRC(uci.slice(0, 2));
  const to = squareToRC(uci.slice(2, 4));
  const promotion = uci.length === 5 ? uci[4].toUpperCase() : null;
  if (promotion && !"QRBN".includes(promotion)) {
    throw new Error(`parseUCI: invalid promotion piece "${uci[4]}"`);
  }
  return { from, to, promotion };
}

export function moveToUCI(from, to, promotion = null) {
  const uci = rcToSquare(from) + rcToSquare(to);
  return promotion ? uci + promotion.toLowerCase() : uci;
}

function squareToRC(square) {
  const fileIdx = FILES.indexOf(square[0]);
  const rankNum = Number(square[1]);
  if (fileIdx < 0 || !(rankNum >= 1 && rankNum <= 8)) {
    throw new Error(`parseUCI: bad square "${square}"`);
  }
  return [8 - rankNum, fileIdx];
}

function rcToSquare([r, c]) {
  return FILES[c] + (8 - r);
}
