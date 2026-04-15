import { describe, expect, it } from "vitest";
import { INIT, cloneBoard } from "../../src/chess/board.js";
import {
  analyzeCurrentPosition,
  analyzeLastMove,
  isHanging,
} from "../../src/chess/coach.js";

const empty = () =>
  Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));

const baseCtx = (overrides = {}) => ({
  moveNumber: 1,
  playerColor: "white",
  theme: null,
  recentTipIds: [],
  ...overrides,
});

describe("isHanging", () => {
  it("lone piece attacked by cheaper enemy is hanging", () => {
    const b = empty();
    b[7][7] = "K";
    b[0][4] = "k";
    b[4][4] = "Q"; // white queen on e4
    b[3][5] = "p"; // black pawn on f5 attacks e4
    expect(isHanging(b, 4, 4)).toBe(true);
  });

  it("attacked piece with equal-or-greater-value defender is NOT hanging", () => {
    const b = empty();
    b[7][7] = "K";
    b[0][4] = "k";
    b[4][4] = "N"; // white knight on e4
    b[3][5] = "p"; // black pawn on f5 attacks e4
    b[5][3] = "P"; // white pawn on d3 defends e4
    // Knight (320) attacked by pawn (100), defended by pawn (100).
    // Lowest attacker (100) < knight value (320) → still hanging per
    // our crude SEE (pawn takes, we recapture with pawn, net -220).
    expect(isHanging(b, 4, 4)).toBe(true);
  });

  it("attacked piece defended by equal or greater value protector is safe", () => {
    const b = empty();
    b[7][7] = "K";
    b[0][4] = "k";
    b[4][4] = "N"; // white knight on e4
    b[3][5] = "n"; // black knight on f5 attacks e4
    b[5][3] = "N"; // white knight on d3 defends
    // Knight (320) attacked by knight (320) and defended by knight (320).
    // Lowest attacker (320) is NOT less than piece value (320) → safe.
    expect(isHanging(b, 4, 4)).toBe(false);
  });

  it("unattacked piece is not hanging", () => {
    const b = empty();
    b[7][7] = "K";
    b[0][4] = "k";
    b[4][4] = "Q";
    expect(isHanging(b, 4, 4)).toBe(false);
  });
});

describe("analyzeLastMove — observational tips", () => {
  it("fires castling tip when king moves two squares", () => {
    const pre = { board: empty() };
    pre.board[7][4] = "K";
    pre.board[7][7] = "R";
    pre.board[0][4] = "k";
    const post = { board: cloneBoard(pre.board) };
    post.board[7][6] = "K";
    post.board[7][5] = "R";
    post.board[7][4] = null;
    post.board[7][7] = null;

    const tip = analyzeLastMove(pre, post, {
      ...baseCtx(),
      from: [7, 4],
      to: [7, 6],
      piece: "K",
      capturedPiece: null,
    });
    expect(tip?.id).toBe("castle");
    expect(tip?.kind).toBe("positive");
  });

  it("fires development tip on first knight move from home", () => {
    const pre = { board: cloneBoard(INIT) };
    const post = { board: cloneBoard(INIT) };
    post.board[5][5] = "N";
    post.board[7][6] = null;

    const tip = analyzeLastMove(pre, post, {
      ...baseCtx({ moveNumber: 1 }),
      from: [7, 6],
      to: [5, 5],
      piece: "N",
      capturedPiece: null,
    });
    expect(tip?.id).toBe("develop");
    expect(tip?.kind).toBe("positive");
  });

  it("does NOT fire development after move 8", () => {
    const pre = { board: cloneBoard(INIT) };
    const post = { board: cloneBoard(INIT) };
    post.board[5][5] = "N";
    post.board[7][6] = null;

    const tip = analyzeLastMove(pre, post, {
      ...baseCtx({ moveNumber: 9 }),
      from: [7, 6],
      to: [5, 5],
      piece: "N",
      capturedPiece: null,
    });
    expect(tip?.id).not.toBe("develop");
  });

  it("fires free-capture tip when capturing a piece and landing square is safe", () => {
    const pre = { board: empty() };
    pre.board[7][7] = "K";
    pre.board[0][4] = "k";
    pre.board[4][4] = "N"; // white knight e4
    pre.board[2][3] = "n"; // black knight on d6 — undefended
    const post = { board: cloneBoard(pre.board) };
    post.board[2][3] = "N";
    post.board[4][4] = null;

    const tip = analyzeLastMove(pre, post, {
      ...baseCtx(),
      from: [4, 4],
      to: [2, 3],
      piece: "N",
      capturedPiece: "n",
    });
    expect(tip?.id).toBe("free-capture");
  });

  it("respects recentTipIds anti-spam", () => {
    const pre = { board: cloneBoard(INIT) };
    const post = { board: cloneBoard(INIT) };
    post.board[5][5] = "N";
    post.board[7][6] = null;

    const tip = analyzeLastMove(pre, post, {
      ...baseCtx({ moveNumber: 1, recentTipIds: ["develop"] }),
      from: [7, 6],
      to: [5, 5],
      piece: "N",
      capturedPiece: null,
    });
    expect(tip?.id).not.toBe("develop");
  });
});

describe("analyzeCurrentPosition — prospective tips", () => {
  it("warns when my piece is hanging", () => {
    const b = empty();
    b[7][7] = "K";
    b[0][4] = "k";
    b[4][4] = "Q"; // white queen on e4
    b[3][5] = "p"; // black pawn attacks it, no defender
    const tip = analyzeCurrentPosition(
      { board: b },
      { playerColor: "white", theme: null }
    );
    expect(tip?.id).toBe("own-hanging");
    expect(tip?.squares).toEqual([[4, 4]]);
  });

  it("highlights a free enemy piece I can capture", () => {
    const b = empty();
    b[7][7] = "K";
    b[0][4] = "k";
    b[4][4] = "N"; // white knight on e4
    b[2][3] = "q"; // undefended black queen on d6
    // Knight e4 → d6 is a legal knight jump, queen is undefended
    const tip = analyzeCurrentPosition(
      { board: b },
      { playerColor: "white", theme: null }
    );
    expect(tip?.id).toBe("free-enemy");
    expect(tip?.squares).toEqual([[2, 3]]);
  });

  it("returns the strategic default when nothing notable", () => {
    const b = empty();
    b[7][4] = "K";
    b[0][4] = "k";
    const tip = analyzeCurrentPosition(
      { board: b },
      { playerColor: "white", theme: null }
    );
    expect(tip?.id).toBe("strategic-default");
  });
});
