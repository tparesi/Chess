// Post-game coaching tips. Each tip has a condition(gameData) that decides
// whether it fires for the game that just ended. Generic chess wording so
// tips work across themes.
//
// gameData: { moves: number, result: "win"|"loss"|"draw", lostMaterial: number }

export const TIPS_DB = [
  {
    id: "opening",
    condition: (g) => g.moves < 20,
    title: "Opening Fundamentals",
    tip: "Control the center with your pawns (d4, e4). Develop knights and bishops early before moving the same piece twice. Castle early to protect your king.",
    video: "chess opening principles beginner tutorial",
  },
  {
    id: "hanging",
    condition: (g) => g.lostMaterial > 8,
    title: "Protect Your Pieces",
    tip: "Before every move, ask: is any of my pieces undefended? Count attackers vs defenders on each square. If the numbers don't add up, move or defend.",
    video: "how to stop blundering pieces chess",
  },
  {
    id: "tactics",
    condition: (g) => g.lostMaterial > 4,
    title: "Tactical Awareness",
    tip: "Look for forks (one piece attacking two targets), pins (a piece stuck in front of a more valuable one), and skewers. These win material.",
    video: "chess tactics forks pins skewers beginner",
  },
  {
    id: "endgame",
    condition: (g) => g.moves > 40,
    title: "Endgame Technique",
    tip: "In the endgame, activate your king! Push passed pawns toward promotion. Centralize your pieces for maximum control.",
    video: "chess endgame basics beginner",
  },
  {
    id: "checkmate",
    condition: (g) => g.result === "loss" && g.moves < 15,
    title: "King Safety",
    tip: "You got checkmated quickly. Prioritize castling, keep protective pawns in front of your king, and watch for back rank threats.",
    video: "chess king safety beginner how to avoid checkmate",
  },
  {
    id: "patience",
    condition: (g) => g.result === "loss",
    title: "Think Before You Move",
    tip: "Before moving, ask three questions: What is my opponent threatening? What is my best move? Does my move leave anything undefended?",
    video: "chess thinking process beginner how to calculate",
  },
  {
    id: "winning",
    condition: (g) => g.result === "win",
    title: "Keep Improving",
    tip: "Great win! To keep growing, study basic tactical patterns and practice puzzles daily. Even 10 minutes of puzzles builds pattern recognition.",
    video: "chess puzzle training improve tactics",
  },
];

export function generateTips(gameData) {
  return TIPS_DB.filter((t) => t.condition(gameData)).slice(0, 3);
}
