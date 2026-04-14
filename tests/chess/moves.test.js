import { describe, expect, it } from "vitest";
import { INIT, INITIAL_CASTLING, cloneBoard } from "../../src/chess/board.js";
import { legalMoves, simulateMove } from "../../src/chess/moves.js";

const empty = () =>
  Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));

describe("legalMoves — starting position", () => {
  it("white e-pawn has two forward moves", () => {
    const moves = legalMoves(INIT, 6, 4, null, INITIAL_CASTLING);
    expect(moves).toEqual(expect.arrayContaining([[5, 4], [4, 4]]));
    expect(moves).toHaveLength(2);
  });

  it("white knight on g1 has two moves", () => {
    const moves = legalMoves(INIT, 7, 6, null, INITIAL_CASTLING);
    expect(moves).toEqual(expect.arrayContaining([[5, 5], [5, 7]]));
    expect(moves).toHaveLength(2);
  });

  it("white rook on a1 has no moves (blocked by pawn)", () => {
    const moves = legalMoves(INIT, 7, 0, null, INITIAL_CASTLING);
    expect(moves).toHaveLength(0);
  });
});

describe("legalMoves — tactics", () => {
  it("pinned piece cannot move off the pin", () => {
    const b = empty();
    b[7][4] = "K";
    b[6][4] = "N";
    b[0][4] = "r";
    const moves = legalMoves(b, 6, 4, null, INITIAL_CASTLING);
    expect(moves).toHaveLength(0);
  });

  it("king cannot move into check", () => {
    const b = empty();
    b[7][4] = "K";
    b[0][4] = "r";
    b[0][3] = "r";
    const moves = legalMoves(b, 7, 4, null, INITIAL_CASTLING);
    for (const [r, c] of moves) {
      expect(c).not.toBe(3);
      expect(c).not.toBe(4);
    }
  });
});

describe("castling", () => {
  it("white can castle kingside when clear", () => {
    const b = empty();
    b[7][4] = "K";
    b[7][7] = "R";
    b[0][0] = "k";
    const moves = legalMoves(b, 7, 4, null, { K: true, Q: false, k: false, q: false });
    expect(moves.some(([r, c]) => r === 7 && c === 6)).toBe(true);
  });

  it("white cannot castle through check", () => {
    const b = empty();
    b[7][4] = "K";
    b[7][7] = "R";
    b[0][5] = "r";
    b[0][0] = "k";
    const moves = legalMoves(b, 7, 4, null, { K: true, Q: false, k: false, q: false });
    expect(moves.some(([r, c]) => r === 7 && c === 6)).toBe(false);
  });
});

describe("en passant", () => {
  it("pawn can capture en passant", () => {
    const b = empty();
    b[7][4] = "K";
    b[0][4] = "k";
    b[3][4] = "P";
    b[3][3] = "p";
    // en passant square is where black just double-pushed over
    const moves = legalMoves(b, 3, 4, [2, 3], INITIAL_CASTLING);
    expect(moves.some(([r, c]) => r === 2 && c === 3)).toBe(true);
  });
});

describe("simulateMove", () => {
  it("moves a piece and flips nothing else", () => {
    const result = simulateMove(INIT, [6, 4], [4, 4], null, INITIAL_CASTLING);
    expect(result.board[6][4]).toBe(null);
    expect(result.board[4][4]).toBe("P");
    expect(result.enPassant).toEqual([5, 4]);
  });

  it("king move clears both castling rights for that side", () => {
    const b = cloneBoard(INIT);
    b[7][5] = null;
    b[7][6] = null;
    const result = simulateMove(b, [7, 4], [7, 5], null, INITIAL_CASTLING);
    expect(result.castling.K).toBe(false);
    expect(result.castling.Q).toBe(false);
    expect(result.castling.k).toBe(true);
    expect(result.castling.q).toBe(true);
  });
});
