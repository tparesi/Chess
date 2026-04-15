// FEN (Forsyth–Edwards Notation) parser/serializer.
// Produces / consumes the same 8x8 string-array board format the rest of the
// engine uses (src/chess/board.js). A FEN string looks like:
//
//   rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
//   │                                            │  │    │ │ │
//   │                                            │  │    │ │ └─ fullmove clock
//   │                                            │  │    │ └─── halfmove clock
//   │                                            │  │    └───── en passant target or "-"
//   │                                            │  └────────── castling rights or "-"
//   │                                            └───────────── turn: "w" or "b"
//   └──── piece placement (8 ranks, rank 8 first, '/' separates)
//
// Inside a rank, digits are runs of empty squares, letters are pieces.
// Uppercase = white, lowercase = black.

import { FILES } from "./board.js";

export function parseFEN(fen) {
  if (!fen || typeof fen !== "string") {
    throw new Error("parseFEN: expected a FEN string");
  }
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) {
    throw new Error(`parseFEN: not enough fields in "${fen}"`);
  }
  const [placement, turnStr, castlingStr, enPassantStr, halfmoveStr, fullmoveStr] = parts;

  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const ranks = placement.split("/");
  if (ranks.length !== 8) {
    throw new Error(`parseFEN: expected 8 ranks, got ${ranks.length}`);
  }
  for (let r = 0; r < 8; r++) {
    let col = 0;
    for (const ch of ranks[r]) {
      if (/[1-8]/.test(ch)) {
        col += Number(ch);
      } else if (/[prnbqkPRNBQK]/.test(ch)) {
        if (col >= 8) {
          throw new Error(`parseFEN: rank ${8 - r} overflows past h-file`);
        }
        board[r][col] = ch;
        col += 1;
      } else {
        throw new Error(`parseFEN: unexpected character '${ch}' in placement`);
      }
    }
    if (col !== 8) {
      throw new Error(`parseFEN: rank ${8 - r} has ${col} squares, expected 8`);
    }
  }

  const turn = turnStr === "w" ? "white" : "black";

  const castling = { K: false, Q: false, k: false, q: false };
  if (castlingStr !== "-") {
    for (const ch of castlingStr) {
      if (ch in castling) castling[ch] = true;
    }
  }

  const enPassant = enPassantStr === "-" ? null : algebraicToSquare(enPassantStr);

  return {
    board,
    turn,
    castling,
    enPassant,
    halfmove: halfmoveStr != null ? Number(halfmoveStr) : 0,
    fullmove: fullmoveStr != null ? Number(fullmoveStr) : 1,
  };
}

export function serializeFEN({ board, turn, castling, enPassant, halfmove = 0, fullmove = 1 }) {
  const ranks = [];
  for (let r = 0; r < 8; r++) {
    let run = 0;
    let line = "";
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) {
        run += 1;
      } else {
        if (run) {
          line += run;
          run = 0;
        }
        line += p;
      }
    }
    if (run) line += run;
    ranks.push(line);
  }
  const placement = ranks.join("/");
  const turnChar = turn === "white" ? "w" : "b";
  const castlingStr =
    (castling.K ? "K" : "") +
    (castling.Q ? "Q" : "") +
    (castling.k ? "k" : "") +
    (castling.q ? "q" : "") || "-";
  const enPassantStr = enPassant ? squareToAlgebraic(enPassant) : "-";
  return `${placement} ${turnChar} ${castlingStr} ${enPassantStr} ${halfmove} ${fullmove}`;
}

// "e4" → [4, 4]  (row 4, col 4)
function algebraicToSquare(square) {
  if (square.length !== 2) throw new Error(`parseFEN: bad square "${square}"`);
  const fileIdx = FILES.indexOf(square[0]);
  const rankNum = Number(square[1]);
  if (fileIdx < 0 || !(rankNum >= 1 && rankNum <= 8)) {
    throw new Error(`parseFEN: bad square "${square}"`);
  }
  return [8 - rankNum, fileIdx];
}

function squareToAlgebraic([r, c]) {
  return FILES[c] + (8 - r);
}
