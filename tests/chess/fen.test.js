import { describe, expect, it } from "vitest";
import { INIT } from "../../src/chess/board.js";
import { parseFEN, serializeFEN } from "../../src/chess/fen.js";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("parseFEN", () => {
  it("starting position", () => {
    const state = parseFEN(START_FEN);
    expect(state.board).toEqual(INIT);
    expect(state.turn).toBe("white");
    expect(state.castling).toEqual({ K: true, Q: true, k: true, q: true });
    expect(state.enPassant).toBe(null);
    expect(state.halfmove).toBe(0);
    expect(state.fullmove).toBe(1);
  });

  it("black to move with en passant target", () => {
    const state = parseFEN("rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 2");
    expect(state.turn).toBe("black");
    expect(state.enPassant).toEqual([5, 4]); // e3 = row 5, col 4
    expect(state.halfmove).toBe(0);
    expect(state.fullmove).toBe(2);
  });

  it("no castling rights", () => {
    const state = parseFEN("8/8/8/8/8/8/8/4k2K w - - 0 1");
    expect(state.castling).toEqual({ K: false, Q: false, k: false, q: false });
  });

  it("throws on bad FEN", () => {
    expect(() => parseFEN("garbage")).toThrow();
    expect(() => parseFEN("8/8/8/8/8/8/8 w - - 0 1")).toThrow();
  });
});

describe("serializeFEN", () => {
  it("round-trips the starting position", () => {
    const state = parseFEN(START_FEN);
    expect(serializeFEN(state)).toBe(START_FEN);
  });

  it("round-trips a mid-game position with en passant", () => {
    const fen = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 2";
    expect(serializeFEN(parseFEN(fen))).toBe(fen);
  });
});
