import { describe, expect, it } from "vitest";
import { INITIAL_CASTLING } from "../../src/chess/board.js";
import { hasLegalMove, isInCheck } from "../../src/chess/moves.js";

const empty = () =>
  Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));

describe("isInCheck", () => {
  it("lone king not in check", () => {
    const b = empty();
    b[4][4] = "K";
    expect(isInCheck(b, "white")).toBe(false);
  });

  it("king in check from enemy rook", () => {
    const b = empty();
    b[7][4] = "K";
    b[0][4] = "r";
    expect(isInCheck(b, "white")).toBe(true);
  });
});

describe("checkmate and stalemate", () => {
  it("back rank mate — no legal moves + in check", () => {
    const b = empty();
    b[0][7] = "k";
    b[1][6] = "p";
    b[1][7] = "p";
    b[0][0] = "R";
    b[7][0] = "K";
    expect(isInCheck(b, "black")).toBe(true);
    expect(hasLegalMove(b, "black", null, INITIAL_CASTLING)).toBe(false);
  });

  it("stalemate — no legal moves but not in check", () => {
    // Classic stalemate: black king on a1, white queen on c2, white king on c3.
    // Black king's only candidate squares (a2, b1, b2) are all attacked, but
    // a1 itself is not attacked, so it's stalemate not checkmate.
    const b = empty();
    b[7][0] = "k";
    b[6][2] = "Q";
    b[5][2] = "K";
    expect(isInCheck(b, "black")).toBe(false);
    expect(hasLegalMove(b, "black", null, INITIAL_CASTLING)).toBe(false);
  });

  it("the king can block check by moving out of line", () => {
    const b = empty();
    b[7][4] = "K";
    b[0][4] = "r";
    expect(hasLegalMove(b, "white", null, INITIAL_CASTLING)).toBe(true);
  });
});
