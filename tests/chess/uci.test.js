import { describe, expect, it } from "vitest";
import { moveToUCI, parseUCI } from "../../src/chess/uci.js";

describe("parseUCI", () => {
  it("simple pawn advance", () => {
    // e2e4 → from e2 (row 6, col 4) to e4 (row 4, col 4)
    expect(parseUCI("e2e4")).toEqual({
      from: [6, 4],
      to: [4, 4],
      promotion: null,
    });
  });

  it("knight move", () => {
    // g1f3 → from g1 (row 7, col 6) to f3 (row 5, col 5)
    expect(parseUCI("g1f3")).toEqual({
      from: [7, 6],
      to: [5, 5],
      promotion: null,
    });
  });

  it("promotion to queen", () => {
    // e7e8q → from e7 (row 1, col 4) to e8 (row 0, col 4) promoting to Q
    expect(parseUCI("e7e8q")).toEqual({
      from: [1, 4],
      to: [0, 4],
      promotion: "Q",
    });
  });

  it("under-promotion to knight", () => {
    expect(parseUCI("a7a8n")).toEqual({
      from: [1, 0],
      to: [0, 0],
      promotion: "N",
    });
  });

  it("throws on bad UCI", () => {
    expect(() => parseUCI("x")).toThrow();
    expect(() => parseUCI("e2e9")).toThrow();
    expect(() => parseUCI("z2e4")).toThrow();
    expect(() => parseUCI("e2e4x")).toThrow();
  });
});

describe("moveToUCI", () => {
  it("round-trips simple moves", () => {
    expect(moveToUCI([6, 4], [4, 4])).toBe("e2e4");
    expect(moveToUCI([7, 6], [5, 5])).toBe("g1f3");
  });

  it("round-trips promotion", () => {
    expect(moveToUCI([1, 4], [0, 4], "Q")).toBe("e7e8q");
    expect(moveToUCI([1, 0], [0, 0], "N")).toBe("a7a8n");
  });
});
