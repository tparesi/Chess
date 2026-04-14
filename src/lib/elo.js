// Standard Elo, K=32, starting rating 1000. Used client-side for preview
// (so kids see "+12 / −12 if I win / lose"); the authoritative update happens
// in the finalize_match Postgres function so it can't be tampered with.

export const STARTING_ELO = 1000;
export const K_FACTOR = 32;

export function expectedScore(ratingA, ratingB) {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export function newRating(rating, expected, actual, k = K_FACTOR) {
  return Math.round(rating + k * (actual - expected));
}

// Convenience: given both ratings and a result ("white"|"black"|"draw"),
// return the new ratings.
export function applyResult(whiteElo, blackElo, result) {
  const we = expectedScore(whiteElo, blackElo);
  const be = expectedScore(blackElo, whiteElo);
  const wa = result === "white" ? 1 : result === "black" ? 0 : 0.5;
  const ba = result === "black" ? 1 : result === "white" ? 0 : 0.5;
  return {
    whiteElo: newRating(whiteElo, we, wa),
    blackElo: newRating(blackElo, be, ba),
    whiteDelta: newRating(whiteElo, we, wa) - whiteElo,
    blackDelta: newRating(blackElo, be, ba) - blackElo,
  };
}
