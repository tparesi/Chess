// Classic unicode chess glyphs. Proves theming is pluggable from day one —
// a one-file drop-in alternative to animalKingdom.

const GLYPHS = {
  K: "♔",
  Q: "♕",
  R: "♖",
  B: "♗",
  N: "♘",
  P: "♙",
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

const LABELS = {
  K: "King",
  Q: "Queen",
  R: "Rook",
  B: "Bishop",
  N: "Knight",
  P: "Pawn",
};
const labels = {};
for (const k of Object.keys(LABELS)) {
  labels[k] = LABELS[k];
  labels[k.toLowerCase()] = LABELS[k];
}

function ClassicPiece({ piece, size = "1em" }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: size,
        lineHeight: 1,
        color: piece === piece.toUpperCase() ? "#f8f4e3" : "#1a1a1a",
        textShadow:
          piece === piece.toUpperCase()
            ? "0 0 2px #000, 0 0 1px #000"
            : "0 0 2px #fff, 0 0 1px #fff",
      }}
    >
      {GLYPHS[piece]}
    </span>
  );
}

export const classic = {
  id: "classic",
  name: "Classic",
  renderPiece: (piece, opts = {}) => <ClassicPiece piece={piece} size={opts.size} />,
  labels,
  boardColors: {
    light: "#f0d9b5",
    dark: "#b58863",
    border: "#6b4f2b",
    coord: "#3b2a16",
  },
  sideNames: { white: "White", black: "Black" },
  sideEmojis: { white: "♔", black: "♚" },
  sideClimates: { white: "◻", black: "◼" },
  winText: {
    white: "White wins!",
    black: "Black wins!",
  },
};
