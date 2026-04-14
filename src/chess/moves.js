import { cloneBoard, colorOf, findKing, inBounds } from "./board.js";

// Returns the list of squares a piece could move to ignoring whether
// the move leaves its own king in check. This is the "pseudo-legal" list.
// Castling is only emitted when castlingRights is truthy (null disables it,
// which is how isSquareAttacked breaks out of recursion).
export function rawMoves(board, row, col, enPassant, castlingRights) {
  const piece = board[row][col];
  if (!piece) return [];
  const color = colorOf(piece);
  const isEnemy = (p) => !!p && colorOf(p) !== color;
  const isEmpty = (r, c) => inBounds(r, c) && !board[r][c];
  const moves = [];
  const pushIfOk = (r, c) => {
    if (inBounds(r, c) && colorOf(board[r][c]) !== color) moves.push([r, c]);
  };
  const slide = (dirs) => {
    for (const [dr, dc] of dirs) {
      let r = row + dr;
      let c = col + dc;
      while (inBounds(r, c)) {
        if (board[r][c]) {
          if (isEnemy(board[r][c])) moves.push([r, c]);
          break;
        }
        moves.push([r, c]);
        r += dr;
        c += dc;
      }
    }
  };

  const type = piece.toUpperCase();

  if (type === "P") {
    const dir = color === "white" ? -1 : 1;
    const startRow = color === "white" ? 6 : 1;
    if (isEmpty(row + dir, col)) {
      moves.push([row + dir, col]);
      if (row === startRow && isEmpty(row + 2 * dir, col)) {
        moves.push([row + 2 * dir, col]);
      }
    }
    for (const dc of [-1, 1]) {
      const nr = row + dir;
      const nc = col + dc;
      if (inBounds(nr, nc) && isEnemy(board[nr][nc])) moves.push([nr, nc]);
      if (enPassant && enPassant[0] === nr && enPassant[1] === nc) moves.push([nr, nc]);
    }
  } else if (type === "N") {
    const jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, dc] of jumps) pushIfOk(row + dr, col + dc);
  } else if (type === "B") {
    slide([[-1,-1],[-1,1],[1,-1],[1,1]]);
  } else if (type === "R") {
    slide([[-1,0],[1,0],[0,-1],[0,1]]);
  } else if (type === "Q") {
    slide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
  } else if (type === "K") {
    for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
      pushIfOk(row + dr, col + dc);
    }
    if (castlingRights) {
      const backRank = color === "white" ? 7 : 0;
      if (row === backRank && col === 4) {
        const ksKey = color === "white" ? "K" : "k";
        if (
          castlingRights[ksKey] &&
          !board[backRank][5] &&
          !board[backRank][6] &&
          board[backRank][7]?.toUpperCase() === "R" &&
          !isSquareAttacked(board, backRank, 4, color) &&
          !isSquareAttacked(board, backRank, 5, color) &&
          !isSquareAttacked(board, backRank, 6, color)
        ) {
          moves.push([backRank, 6]);
        }
        const qsKey = color === "white" ? "Q" : "q";
        if (
          castlingRights[qsKey] &&
          !board[backRank][3] &&
          !board[backRank][2] &&
          !board[backRank][1] &&
          board[backRank][0]?.toUpperCase() === "R" &&
          !isSquareAttacked(board, backRank, 4, color) &&
          !isSquareAttacked(board, backRank, 3, color) &&
          !isSquareAttacked(board, backRank, 2, color)
        ) {
          moves.push([backRank, 2]);
        }
      }
    }
  }

  return moves;
}

// `byColor` is the color being attacked; attackers are the other side.
export function isSquareAttacked(board, row, col, byColor) {
  const attackerColor = byColor === "white" ? "black" : "white";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || colorOf(piece) !== attackerColor) continue;
      // Pass null for castlingRights to prevent recursion via king castling check.
      if (rawMoves(board, r, c, null, null).some(([tr, tc]) => tr === row && tc === col)) {
        return true;
      }
    }
  }
  return false;
}

export function isInCheck(board, color) {
  const kingPos = findKing(board, color);
  return kingPos ? isSquareAttacked(board, kingPos[0], kingPos[1], color) : false;
}

export function legalMoves(board, row, col, enPassant, castlingRights) {
  const piece = board[row][col];
  if (!piece) return [];
  const color = colorOf(piece);
  return rawMoves(board, row, col, enPassant, castlingRights).filter(([tr, tc]) => {
    const sim = cloneBoard(board);
    if (piece.toUpperCase() === "P" && enPassant && tr === enPassant[0] && tc === enPassant[1]) {
      sim[color === "white" ? tr + 1 : tr - 1][tc] = null;
    }
    sim[tr][tc] = sim[row][col];
    sim[row][col] = null;
    if (piece.toUpperCase() === "K" && Math.abs(tc - col) === 2) {
      const backRank = color === "white" ? 7 : 0;
      if (tc === 6) {
        sim[backRank][5] = sim[backRank][7];
        sim[backRank][7] = null;
      }
      if (tc === 2) {
        sim[backRank][3] = sim[backRank][0];
        sim[backRank][0] = null;
      }
    }
    return !isInCheck(sim, color);
  });
}

export function hasLegalMove(board, color, enPassant, castlingRights) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] && colorOf(board[r][c]) === color) {
        if (legalMoves(board, r, c, enPassant, castlingRights).length > 0) return true;
      }
    }
  }
  return false;
}

export function allLegalMoves(board, color, enPassant, castlingRights) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] && colorOf(board[r][c]) === color) {
        for (const [tr, tc] of legalMoves(board, r, c, enPassant, castlingRights)) {
          moves.push({ from: [r, c], to: [tr, tc] });
        }
      }
    }
  }
  return moves;
}

// Applies a move and returns the next state. Assumes the move is legal;
// callers should validate via legalMoves first. Auto-promotes pawns to queen
// (callers that need under-promotion should apply it after).
export function simulateMove(board, from, to, enPassant, castlingRights) {
  const sim = cloneBoard(board);
  const [sr, sc] = from;
  const [tr, tc] = to;
  const piece = sim[sr][sc];
  const color = colorOf(piece);
  const type = piece.toUpperCase();
  let nextEnPassant = null;
  const newCastling = { ...castlingRights };

  if (type === "P" && enPassant && tr === enPassant[0] && tc === enPassant[1]) {
    sim[color === "white" ? tr + 1 : tr - 1][tc] = null;
  }

  sim[tr][tc] = piece;
  sim[sr][sc] = null;

  if (type === "P" && (tr === 0 || tr === 7)) {
    sim[tr][tc] = color === "white" ? "Q" : "q";
  }

  if (type === "K" && Math.abs(tc - sc) === 2) {
    const backRank = color === "white" ? 7 : 0;
    if (tc === 6) {
      sim[backRank][5] = sim[backRank][7];
      sim[backRank][7] = null;
    }
    if (tc === 2) {
      sim[backRank][3] = sim[backRank][0];
      sim[backRank][0] = null;
    }
  }

  if (type === "P" && Math.abs(tr - sr) === 2) {
    nextEnPassant = [(sr + tr) / 2, sc];
  }

  if (type === "K") {
    if (color === "white") {
      newCastling.K = false;
      newCastling.Q = false;
    } else {
      newCastling.k = false;
      newCastling.q = false;
    }
  }
  if (type === "R") {
    if (sr === 7 && sc === 0) newCastling.Q = false;
    if (sr === 7 && sc === 7) newCastling.K = false;
    if (sr === 0 && sc === 0) newCastling.q = false;
    if (sr === 0 && sc === 7) newCastling.k = false;
  }
  if (tr === 0 && tc === 0) newCastling.q = false;
  if (tr === 0 && tc === 7) newCastling.k = false;
  if (tr === 7 && tc === 0) newCastling.Q = false;
  if (tr === 7 && tc === 7) newCastling.K = false;

  return { board: sim, enPassant: nextEnPassant, castling: newCastling };
}
