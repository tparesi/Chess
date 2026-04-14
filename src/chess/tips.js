// Post-game coaching tips. Each tip has a condition(gameData) that decides
// whether it fires for the game that just ended. Generic chess wording so
// tips work across themes.
//
// gameData: { moves: number, result: "win"|"loss"|"draw", lostMaterial: number }
//
// `url` points at a stable Lichess practice/learn page — they're ad-free,
// kid-friendly, and the URLs don't rot the way YouTube search links do.

export const TIPS_DB = [
  {
    id: "opening",
    condition: (g) => g.moves < 20,
    title: "Opening Fundamentals",
    tip: "Control the center with your pawns (d4, e4). Develop knights and bishops early before moving the same piece twice. Castle early to protect your king.",
    url: "https://lichess.org/learn",
    urlLabel: "Learn the basics on Lichess",
  },
  {
    id: "hanging",
    condition: (g) => g.lostMaterial > 8,
    title: "Protect Your Pieces",
    tip: "Before every move, ask: is any of my pieces undefended? Count attackers vs defenders on each square. If the numbers don't add up, move or defend.",
    url: "https://lichess.org/training",
    urlLabel: "Practice on Lichess puzzles",
  },
  {
    id: "tactics",
    condition: (g) => g.lostMaterial > 4,
    title: "Tactical Awareness",
    tip: "Look for forks (one piece attacking two targets), pins (a piece stuck in front of a more valuable one), and skewers. These win material.",
    url: "https://lichess.org/practice",
    urlLabel: "Practice tactics on Lichess",
  },
  {
    id: "endgame",
    condition: (g) => g.moves > 40,
    title: "Endgame Technique",
    tip: "In the endgame, activate your king! Push passed pawns toward promotion. Centralize your pieces for maximum control.",
    url: "https://lichess.org/practice",
    urlLabel: "Practice endgames on Lichess",
  },
  {
    id: "checkmate",
    condition: (g) => g.result === "loss" && g.moves < 15,
    title: "King Safety",
    tip: "You got checkmated quickly. Prioritize castling, keep protective pawns in front of your king, and watch for back rank threats.",
    url: "https://lichess.org/practice",
    urlLabel: "Practice checkmate patterns",
  },
  {
    id: "patience",
    condition: (g) => g.result === "loss",
    title: "Think Before You Move",
    tip: "Before moving, ask three questions: What is my opponent threatening? What is my best move? Does my move leave anything undefended?",
    url: "https://lichess.org/training",
    urlLabel: "Train calculation on Lichess",
  },
  {
    id: "winning",
    condition: (g) => g.result === "win",
    title: "Keep Improving",
    tip: "Great win! To keep growing, study basic tactical patterns and practice puzzles daily. Even 10 minutes of puzzles builds pattern recognition.",
    url: "https://lichess.org/training",
    urlLabel: "Daily puzzles on Lichess",
  },
];

export function generateTips(gameData) {
  return TIPS_DB.filter((t) => t.condition(gameData)).slice(0, 3);
}
