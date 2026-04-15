// Headless puzzle solver — a small state machine that drives a Lichess-style
// puzzle from initial FEN through a sequence of expected UCI moves.
//
// Lichess convention:
//   - The puzzle ships with a FEN + list of UCI moves
//   - The FIRST move in the list is played automatically by the opponent
//     ("you just saw your opponent blunder"). After that, it's the solver's
//     turn.
//   - Each odd-indexed move (from zero: 1, 3, 5, ...) is the player's move.
//   - Each even-indexed move (2, 4, ...) is the forced opponent reply and is
//     played automatically when the player gets their move right.
//   - Puzzle is complete when the player has played every expected move.

import { cloneBoard, colorOf } from "./board.js";
import { simulateMove } from "./moves.js";
import { parseFEN } from "./fen.js";
import { parseUCI } from "./uci.js";

export function createPuzzleSolver(puzzle) {
  // Initial parse
  const initial = parseFEN(puzzle.fen);
  let board = cloneBoard(initial.board);
  let enPassant = initial.enPassant;
  let castling = { ...initial.castling };
  let turn = initial.turn;
  let moveIndex = 0;

  // Apply the first move (opponent setup move) automatically
  const firstMove = parseUCI(puzzle.moves[0]);
  const after = simulateMove(board, firstMove.from, firstMove.to, enPassant, castling);
  board = after.board;
  enPassant = after.enPassant;
  castling = after.castling;
  turn = turn === "white" ? "black" : "white";
  moveIndex = 1;

  // The side who moves next (i.e. the player)
  const playerColor = turn;

  function currentBoard() {
    return board;
  }
  function currentState() {
    return { board, turn, enPassant, castling };
  }
  function playerToMove() {
    return playerColor;
  }
  function isDone() {
    return moveIndex >= puzzle.moves.length;
  }
  function expectedMoveUCI() {
    return puzzle.moves[moveIndex] ?? null;
  }
  function expectedMove() {
    const uci = expectedMoveUCI();
    return uci ? parseUCI(uci) : null;
  }

  // Returns the square the correct-piece-to-move is on, for the hint.
  function getHintFrom() {
    const exp = expectedMove();
    return exp ? exp.from : null;
  }

  // Returns an array of UCI strings representing the remaining solution,
  // player moves only (not opponent replies).
  function getRemainingPlayerMoves() {
    const out = [];
    for (let i = moveIndex; i < puzzle.moves.length; i += 2) {
      out.push(puzzle.moves[i]);
    }
    return out;
  }

  // Tries the given move. Returns:
  //   { correct: false }                               — wrong; state unchanged
  //   { correct: true, done: true }                    — final move, puzzle solved
  //   { correct: true, done: false, opponentUCI }      — advance; opponent reply applied
  function submitMove(from, to, promo = null) {
    const expected = expectedMove();
    if (!expected) return { correct: false, done: true };

    const matches =
      expected.from[0] === from[0] &&
      expected.from[1] === from[1] &&
      expected.to[0] === to[0] &&
      expected.to[1] === to[1] &&
      (expected.promotion
        ? expected.promotion === (promo ? promo.toUpperCase() : null)
        : true);

    if (!matches) return { correct: false };

    // Apply the player's move
    let next = simulateMove(board, from, to, enPassant, castling);
    // Under-promotion override (simulateMove auto-queens)
    if (expected.promotion && expected.promotion !== "Q") {
      const p = board[from[0]][from[1]];
      const isWhite = colorOf(p) === "white";
      next.board[to[0]][to[1]] = isWhite
        ? expected.promotion
        : expected.promotion.toLowerCase();
    }
    board = next.board;
    enPassant = next.enPassant;
    castling = next.castling;
    turn = turn === "white" ? "black" : "white";
    moveIndex += 1;

    if (moveIndex >= puzzle.moves.length) {
      return { correct: true, done: true };
    }

    // Apply opponent's forced reply
    const oppUCI = puzzle.moves[moveIndex];
    const opp = parseUCI(oppUCI);
    const after = simulateMove(board, opp.from, opp.to, enPassant, castling);
    if (opp.promotion && opp.promotion !== "Q") {
      const p = board[opp.from[0]][opp.from[1]];
      const isWhite = colorOf(p) === "white";
      after.board[opp.to[0]][opp.to[1]] = isWhite
        ? opp.promotion
        : opp.promotion.toLowerCase();
    }
    board = after.board;
    enPassant = after.enPassant;
    castling = after.castling;
    turn = turn === "white" ? "black" : "white";
    moveIndex += 1;

    return {
      correct: true,
      done: moveIndex >= puzzle.moves.length,
      opponentUCI: oppUCI,
    };
  }

  return {
    currentBoard,
    currentState,
    playerToMove,
    isDone,
    expectedMoveUCI,
    expectedMove,
    getHintFrom,
    getRemainingPlayerMoves,
    submitMove,
  };
}
