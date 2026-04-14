import { describe, expect, it } from "vitest";
import { K_FACTOR, applyResult, expectedScore, newRating } from "../../src/lib/elo.js";

describe("ELO math", () => {
  it("equal ratings expect 0.5 each", () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5);
  });

  it("higher-rated player has expected > 0.5", () => {
    expect(expectedScore(1200, 1000)).toBeGreaterThan(0.5);
    expect(expectedScore(1000, 1200)).toBeLessThan(0.5);
  });

  it("zero-sum: equal ratings, winner gains K/2", () => {
    const res = applyResult(1000, 1000, "white");
    expect(res.whiteDelta).toBe(K_FACTOR / 2);
    expect(res.blackDelta).toBe(-K_FACTOR / 2);
  });

  it("draw between equal ratings is a no-op", () => {
    const res = applyResult(1500, 1500, "draw");
    expect(res.whiteElo).toBe(1500);
    expect(res.blackElo).toBe(1500);
  });

  it("upset (lower rated wins) gains more points than expected", () => {
    const res = applyResult(1000, 1400, "white");
    expect(res.whiteDelta).toBeGreaterThan(K_FACTOR / 2);
    expect(res.blackDelta).toBeLessThan(-K_FACTOR / 2);
  });

  it("newRating uses default k=32", () => {
    expect(newRating(1000, 0.5, 1)).toBe(1016);
  });
});
