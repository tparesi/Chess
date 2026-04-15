import { describe, expect, it } from "vitest";
import { createPuzzleSolver } from "../../src/chess/puzzleSolver.js";

// A real (simplified) mate-in-1 position: black king on h8, white back-rank
// threat from Ra1. After opponent plays a random waiting move, player finds
// Ra1-a8# back-rank mate.
//
// FEN: white to move (pawn push), then black responds, then white mates.
//
// Position: black king on h8, two black pawns on g7/h7 shielding g8/h8,
//           white king on e1, white rook on a1. White to move.
const MATE_IN_1 = {
  fen: "7k/6pp/8/8/8/8/PPPPP3/R3K3 w Q - 0 1",
  // White pushes a2-a3 (setup), black plays ...a7a6 (forced for the puzzle,
  // but black has no pawn on a7; adjust). Let me use a self-consistent move:
  // White a2a3, black g7g6, white Ra1a8#
  moves: ["a2a3", "g7g6", "a1a8"],
};

describe("createPuzzleSolver", () => {
  it("initializes by auto-applying the first (opponent) move", () => {
    const solver = createPuzzleSolver(MATE_IN_1);
    // After the first move, it should be black's turn (the player)
    expect(solver.playerToMove()).toBe("black");
    // The setup pawn should now be on a3
    const b = solver.currentBoard();
    expect(b[5][0]).toBe("P"); // a3
    expect(b[6][0]).toBe(null); // a2 empty
  });

  it("accepts the correct player move and auto-plays opponent reply", () => {
    const solver = createPuzzleSolver(MATE_IN_1);
    // Expected player move: g7g6. The opponent's reply (a1a8) is the last
    // move in the sequence, so after applying it the puzzle is complete.
    const result = solver.submitMove([1, 6], [2, 6]);
    expect(result.correct).toBe(true);
    expect(result.opponentUCI).toBe("a1a8");
    expect(result.done).toBe(true);
    expect(solver.isDone()).toBe(true);
  });

  it("rejects a wrong move and leaves state unchanged", () => {
    const solver = createPuzzleSolver(MATE_IN_1);
    const before = JSON.stringify(solver.currentBoard());
    // Wrong move: push black h-pawn instead of g-pawn
    const result = solver.submitMove([1, 7], [2, 7]);
    expect(result.correct).toBe(false);
    expect(JSON.stringify(solver.currentBoard())).toBe(before);
    expect(solver.isDone()).toBe(false);
  });

  it("getHintFrom points at the correct-piece-to-move square", () => {
    const solver = createPuzzleSolver(MATE_IN_1);
    // Expected player move is g7g6, so hint is [1, 6]
    expect(solver.getHintFrom()).toEqual([1, 6]);
  });

  it("getRemainingPlayerMoves returns the player's half of the solution", () => {
    const solver = createPuzzleSolver(MATE_IN_1);
    // Opponent setup was auto-applied; remaining player moves: g7g6
    expect(solver.getRemainingPlayerMoves()).toEqual(["g7g6"]);
  });

  it("drives a 2-move puzzle to completion through correct moves", () => {
    // A slightly longer puzzle: player plays 2 moves, opponent plays in between.
    // Setup: white just pushed e2-e4. Player (black) plays d7d5, white captures
    // exd5, player recaptures with queen qd8xd5.
    const puzzle = {
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      // moves: e2e4 (setup), d7d5 (player), e4d5 (opp), d8d5 (player)
      moves: ["e2e4", "d7d5", "e4d5", "d8d5"],
    };
    const solver = createPuzzleSolver(puzzle);
    expect(solver.playerToMove()).toBe("black");

    // Player plays d7d5
    const step1 = solver.submitMove([1, 3], [3, 3]);
    expect(step1.correct).toBe(true);
    expect(step1.done).toBe(false);
    expect(step1.opponentUCI).toBe("e4d5");

    // Board should now have white pawn on d5 (after capture)
    expect(solver.currentBoard()[3][3]).toBe("P");

    // Player plays d8d5 (queen takes back)
    const step2 = solver.submitMove([0, 3], [3, 3]);
    expect(step2.correct).toBe(true);
    expect(step2.done).toBe(true);
    expect(solver.isDone()).toBe(true);
  });
});
