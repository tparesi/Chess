// In-game coach analyzer.
//
// Two entry points:
//   - analyzeLastMove(preBoard, postBoard, moveContext)  → observational Tip|null
//   - analyzeCurrentPosition(state, context)             → prospective Tip|null
//
// Observational tips describe what the kid JUST DID and are always positive
// or neutral (never warnings). They're safe to show in both AI and PvP games.
//
// Prospective tips describe the CURRENT POSITION and tell the kid what to
// look at next. They're assistive, so they're AI-only and only surface when
// the kid explicitly taps the Get Help button.

import { FILES, colorOf, inBounds, isWhite } from "./board.js";
import { PIECE_VALUES } from "./ai.js";
import { rawMoves } from "./moves.js";

// ────────────────────────────────────────────────────────────────
// Low-level attacker / defender helpers
// ────────────────────────────────────────────────────────────────

function enemyOf(color) {
  return color === "white" ? "black" : "white";
}

function pieceValue(piece) {
  if (!piece) return 0;
  return PIECE_VALUES[piece.toUpperCase()] ?? 0;
}

// Returns an array of [r, c] squares from which `byColor` pieces could
// capture the piece on (row, col). Uses rawMoves with castlingRights=null
// and enPassant=null so there's no recursion or edge cases; for SEE-style
// checks on a single square, rawMoves is exactly right.
function attackersOf(board, row, col, byColor) {
  const attackers = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || colorOf(piece) !== byColor) continue;
      const moves = rawMoves(board, r, c, null, null);
      if (moves.some(([tr, tc]) => tr === row && tc === col)) {
        attackers.push([r, c]);
      }
    }
  }
  return attackers;
}

function countAttackers(board, row, col, byColor) {
  return attackersOf(board, row, col, byColor).length;
}

function lowestAttackerValue(board, row, col, byColor) {
  const atks = attackersOf(board, row, col, byColor);
  if (atks.length === 0) return Infinity;
  let min = Infinity;
  for (const [r, c] of atks) {
    const v = pieceValue(board[r][c]);
    if (v < min) min = v;
  }
  return min;
}

// Crude SEE ("static exchange evaluation"): a piece on (row, col) is
// considered hanging if it's attacked AND either it has no defenders at all
// OR the cheapest attacker is cheaper than the piece being attacked (so
// even after a recapture, the defender comes out behind).
export function isHanging(board, row, col) {
  const piece = board[row][col];
  if (!piece) return false;
  const myColor = colorOf(piece);
  const enemyColor = enemyOf(myColor);
  const attackers = countAttackers(board, row, col, enemyColor);
  if (attackers === 0) return false;
  const defenders = countAttackers(board, row, col, myColor);
  if (defenders === 0) return true;
  const lowAttacker = lowestAttackerValue(board, row, col, enemyColor);
  const myValue = pieceValue(piece);
  return lowAttacker < myValue;
}

// ────────────────────────────────────────────────────────────────
// Move inference from a board diff
// ────────────────────────────────────────────────────────────────

// Given two boards and which color just moved, return the primary move
// (from, to, piece, capturedPiece). Used by GameRoom, which receives board
// updates via Realtime and needs to figure out WHAT moved. Handles the
// common cases: normal move, capture, promotion. Castling returns the
// king's move (rook movement is a side effect). En passant returns the
// pawn's move (the captured pawn won't be flagged as the TO square).
export function inferMoveFromDiff(prev, next, movingColor) {
  const wantsWhite = movingColor === "white";
  let from = null;
  let to = null;
  let piece = null;
  let capturedPiece = null;

  // TO square: the new position of the moved piece. A square where the
  // previous content differs and the new content is movingColor's piece.
  outer: for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const before = prev[r][c];
      const after = next[r][c];
      if (!after) continue;
      if (before === after) continue;
      const afterIsMoving = isWhite(after) === wantsWhite;
      if (!afterIsMoving) continue;
      to = [r, c];
      piece = after;
      if (before && isWhite(before) !== wantsWhite) capturedPiece = before;
      break outer;
    }
  }

  // FROM square: a square that previously held a movingColor piece and
  // is now empty (or holds a different piece), and isn't the TO square.
  // Prefer the one matching the piece type we moved (handles castling: the
  // king's origin rather than the rook's).
  const findFrom = (requireSameType) => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (to && r === to[0] && c === to[1]) continue;
        const before = prev[r][c];
        const after = next[r][c];
        if (!before) continue;
        if (after === before) continue;
        if (isWhite(before) !== wantsWhite) continue;
        if (requireSameType && piece && before.toUpperCase() !== piece.toUpperCase()) continue;
        return [r, c];
      }
    }
    return null;
  };

  from = findFrom(true) ?? findFrom(false);
  return { from, to, piece, capturedPiece };
}

// ────────────────────────────────────────────────────────────────
// Square formatting
// ────────────────────────────────────────────────────────────────

function squareName(row, col) {
  return FILES[col] + (8 - row);
}

// Given a piece letter (e.g. "K") and the active theme, returns a
// kid-friendly name. Falls back to "piece" if no theme label is available.
function pieceLabel(piece, theme) {
  if (!piece) return "piece";
  const key = piece.toUpperCase();
  return theme?.labels?.[key] ?? key;
}

// ────────────────────────────────────────────────────────────────
// Observational analyzer — "what did you just do?"
// ────────────────────────────────────────────────────────────────

/**
 * @param {Object} pre   — { board, captured } — board BEFORE the move
 * @param {Object} post  — { board, captured } — board AFTER the move
 * @param {Object} ctx   — { from, to, piece, capturedPiece, moveNumber, playerColor, theme, recentTipIds }
 * @returns {Tip|null}
 */
export function analyzeLastMove(pre, post, ctx) {
  const { from, to, piece, capturedPiece, moveNumber, playerColor, theme, recentTipIds = [] } =
    ctx;
  if (!piece) return null;
  const pieceType = piece.toUpperCase();

  // 1. Castling — king moved two squares
  if (pieceType === "K" && Math.abs(to[1] - from[1]) === 2 && !recentTipIds.includes("castle")) {
    return {
      id: "castle",
      kind: "positive",
      title: "Nice castle",
      message: "Your king is safer now.",
    };
  }

  // 2. Free capture — took an enemy piece of value >= knight (300+) and
  //    that landing square isn't under attack by the enemy, OR any defender
  //    is of equal or greater value than the cheapest attacker after trade.
  if (capturedPiece && pieceValue(capturedPiece) >= 300) {
    // Was the captured piece undefended on the POST board? Well, "post" no
    // longer has the captured piece — we need to check whether the square
    // we moved TO is now under attack (which would mean we traded).
    const attackersAfter = countAttackers(
      post.board,
      to[0],
      to[1],
      enemyOf(playerColor)
    );
    if (attackersAfter === 0 && !recentTipIds.includes("free-capture")) {
      return {
        id: "free-capture",
        kind: "positive",
        title: "Nice!",
        message: "That piece was free!",
      };
    }
  }

  // 3. Good trade — captured something worth more than whatever we might
  //    lose in recapture (value of piece on landing square + value of the
  //    captured minus our piece's value if lost). Simple version: we
  //    captured something of value >= our piece's value AND even if
  //    recaptured, we're materially ahead.
  if (capturedPiece && !recentTipIds.includes("good-trade")) {
    const attackersAfter = countAttackers(
      post.board,
      to[0],
      to[1],
      enemyOf(playerColor)
    );
    if (attackersAfter > 0) {
      const capturedValue = pieceValue(capturedPiece);
      const ourValue = pieceValue(piece);
      // Minimum we'd lose if recaptured = our piece's value
      if (capturedValue > ourValue) {
        return {
          id: "good-trade",
          kind: "positive",
          title: "Good trade",
          message: "You came out ahead on that exchange.",
        };
      }
    }
  }

  // 4. Opening development — in moves 1–8, moved a knight or bishop off
  //    its starting square for the first time. (We detect "first time" via
  //    the previous board: the piece was on a back-rank home square.)
  if (moveNumber <= 8 && (pieceType === "N" || pieceType === "B")) {
    const homeRank = playerColor === "white" ? 7 : 0;
    const onHome = from[0] === homeRank;
    if (onHome && !recentTipIds.includes("develop")) {
      return {
        id: "develop",
        kind: "positive",
        title: "Good development",
        message: "Moving knights and bishops into play is a great way to start.",
      };
    }
  }

  return null;
}

// ────────────────────────────────────────────────────────────────
// Prospective analyzer — "what should you do now?"
// ────────────────────────────────────────────────────────────────

/**
 * @param {Object} state   — { board, enPassant, castling }
 * @param {Object} ctx     — { playerColor, theme }
 * @returns {Tip|null}
 */
export function analyzeCurrentPosition(state, ctx) {
  const { board } = state;
  const { playerColor, theme } = ctx;
  const enemyColor = enemyOf(playerColor);

  // Rule 1: is one of my pieces hanging?
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || colorOf(p) !== playerColor) continue;
      // Kings can't be "hanging" in the capture sense — check would be illegal
      if (p.toUpperCase() === "K") continue;
      if (!isHanging(board, r, c)) continue;
      const name = pieceLabel(p, theme);
      return {
        id: "own-hanging",
        kind: "warning",
        title: `Careful — your ${name} is attacked`,
        message: `Your ${name} on ${squareName(r, c)} can be captured. Defend it or move it!`,
        squares: [[r, c]],
      };
    }
  }

  // Rule 2: is there a free enemy piece I could capture?
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || colorOf(p) !== enemyColor) continue;
      if (p.toUpperCase() === "K") continue;
      if (pieceValue(p) < 300) continue; // skip pawns for the "free piece" tip
      const defenders = countAttackers(board, r, c, enemyColor);
      if (defenders > 0) continue; // defended, not free
      // Can any of our pieces actually reach this square?
      const ourReach = attackersOf(board, r, c, playerColor);
      if (ourReach.length === 0) continue;
      const name = pieceLabel(p, theme);
      return {
        id: "free-enemy",
        kind: "positive",
        title: "Look — there's a free piece!",
        message: `The ${name} on ${squareName(r, c)} isn't defended. Can you take it?`,
        squares: [[r, c]],
      };
    }
  }

  // Rule 3: is an enemy piece looking at one of mine (weaker signal)?
  // Only fires when neither of the above did. We look for any friendly
  // piece that's currently attacked by an enemy (even if defended).
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || colorOf(p) !== playerColor) continue;
      if (p.toUpperCase() === "K") continue;
      if (pieceValue(p) < 300) continue;
      if (countAttackers(board, r, c, enemyColor) === 0) continue;
      const name = pieceLabel(p, theme);
      return {
        id: "own-attacked",
        kind: "info",
        title: "Be careful next turn",
        message: `Their pieces are looking at your ${name} on ${squareName(r, c)}.`,
        squares: [[r, c]],
      };
    }
  }

  // Default — generic strategic nudge.
  return {
    id: "strategic-default",
    kind: "info",
    title: "Keep improving",
    message: "Try developing a piece, castling, or taking the center with a pawn.",
  };
}
