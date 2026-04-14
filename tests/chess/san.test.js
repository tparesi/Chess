import { describe, expect, it } from "vitest";
import { INIT, INITIAL_CASTLING, cloneBoard } from "../../src/chess/board.js";
import { moveToSAN } from "../../src/chess/san.js";

const empty = () =>
  Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));

const state = (enPassant = null, castling = INITIAL_CASTLING) => ({ enPassant, castling });

describe("SAN — pawn moves", () => {
  it("simple pawn advance", () => {
    // e2→e4
    expect(moveToSAN(INIT, [6, 4], [4, 4], state())).toBe("e4");
  });

  it("pawn capture includes origin file", () => {
    const b = empty();
    b[7][4] = "K";
    b[0][4] = "k";
    b[4][4] = "P"; // white pawn on e4
    b[3][5] = "p"; // black pawn on f5
    // e4xf5
    expect(moveToSAN(b, [4, 4], [3, 5], state())).toBe("exf5");
  });

  it("en passant capture uses the pawn file", () => {
    const b = empty();
    b[7][4] = "K";
    b[0][4] = "k";
    b[3][4] = "P";
    b[3][3] = "p";
    expect(moveToSAN(b, [3, 4], [2, 3], state([2, 3]))).toBe("exd6");
  });

  it("promotion without capture", () => {
    // Black king on h5 so the promoted queen on a8 doesn't check it.
    const b = empty();
    b[7][4] = "K"; // Ke1
    b[4][7] = "k"; // Kh5
    b[1][0] = "P"; // a7
    expect(moveToSAN(b, [1, 0], [0, 0], state(), "Q")).toBe("a8=Q");
  });

  it("promotion with capture", () => {
    const b = empty();
    b[7][4] = "K"; // Ke1
    b[4][7] = "k"; // Kh5
    b[1][0] = "P"; // a7
    b[0][1] = "r"; // rb8
    expect(moveToSAN(b, [1, 0], [0, 1], state(), "Q")).toBe("axb8=Q");
  });

  it("under-promotion to knight", () => {
    const b = empty();
    b[7][4] = "K"; // Ke1
    b[4][7] = "k"; // Kh5
    b[1][0] = "P"; // a7
    expect(moveToSAN(b, [1, 0], [0, 0], state(), "N")).toBe("a8=N");
  });
});

describe("SAN — piece moves", () => {
  it("knight move", () => {
    // Ng1→f3 from the starting position
    expect(moveToSAN(INIT, [7, 6], [5, 5], state())).toBe("Nf3");
  });

  it("knight capture", () => {
    // Knight on e4 captures pawn on g5. Landing on g5 doesn't attack
    // the black king on e8, so no check suffix.
    const b = empty();
    b[7][4] = "K";
    b[0][4] = "k";
    b[4][4] = "N"; // Ne4
    b[3][6] = "p"; // pg5
    expect(moveToSAN(b, [4, 4], [3, 6], state())).toBe("Nxg5");
  });
});

describe("SAN — castling", () => {
  it("white kingside", () => {
    const b = empty();
    b[7][4] = "K";
    b[7][7] = "R";
    b[0][0] = "k";
    expect(moveToSAN(b, [7, 4], [7, 6], state(null, { K: true, Q: false, k: false, q: false }))).toBe("O-O");
  });

  it("white queenside", () => {
    const b = empty();
    b[7][4] = "K";
    b[7][0] = "R";
    b[0][0] = "k";
    expect(moveToSAN(b, [7, 4], [7, 2], state(null, { K: false, Q: true, k: false, q: false }))).toBe("O-O-O");
  });
});

describe("SAN — check and mate suffixes", () => {
  it("+ for check", () => {
    // White rook on a1 slides to e1, pinning the black king on e8
    // along the open e-file. Black king has escape squares so it's
    // just check, not mate.
    const b = empty();
    b[7][0] = "R"; // Ra1
    b[7][7] = "K"; // Kh1 — off the e-file
    b[0][4] = "k"; // Ke8
    expect(moveToSAN(b, [7, 0], [7, 4], state())).toBe("Re1+");
  });

  it("# for mate (back rank)", () => {
    // Classic back rank: white rook mates black king on h8
    const b = empty();
    b[0][7] = "k";
    b[1][6] = "p";
    b[1][7] = "p";
    b[7][4] = "K";
    b[7][0] = "R"; // white rook on a1
    // R a1 → a8 delivers mate
    expect(moveToSAN(b, [7, 0], [0, 0], state())).toBe("Ra8#");
  });
});

describe("SAN — disambiguation", () => {
  it("uses file when two same-type pieces differ by file", () => {
    // Two white rooks on a1 and h1, both can move to d1.
    // White king off rank 1 so it doesn't block Rh1→d1.
    // Black king in the middle (e5) so neither rook checks it from h1/a1.
    const b = empty();
    b[7][0] = "R"; // Ra1
    b[7][7] = "R"; // Rh1
    b[5][4] = "K"; // Ke3
    b[3][4] = "k"; // Ke5 — safely off rank 1 and files a/h/d
    expect(moveToSAN(b, [7, 0], [7, 3], state())).toBe("Rad1");
    expect(moveToSAN(b, [7, 7], [7, 3], state())).toBe("Rhd1");
  });

  it("uses rank when two same-type pieces share file", () => {
    // White rooks on a2 and a7, both can move to a5.
    // Kings off the a-file so no incidental check.
    const b = empty();
    b[6][0] = "R"; // Ra2
    b[1][0] = "R"; // Ra7
    b[7][4] = "K"; // Ke1
    b[0][7] = "k"; // Kh8
    expect(moveToSAN(b, [6, 0], [3, 0], state())).toBe("R2a5");
    expect(moveToSAN(b, [1, 0], [3, 0], state())).toBe("R7a5");
  });
});
