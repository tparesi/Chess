// The default theme — a cute animal kingdom.
// Both sides use the same six animals so kids can recognize pieces instantly;
// ownership is shown by a colored disc behind each piece (cream for white,
// dark brown for black). Uppercase keys = white, lowercase = black.

const WHITE_DISC = {
  background: "radial-gradient(circle at 35% 30%, #fff8e7 0%, #e8d4a0 55%, #c4a867 100%)",
  shadow: "0 2px 3px rgba(0, 0, 0, 0.35), inset 0 -1.5px 2px rgba(120, 80, 20, 0.35)",
  ring: "1.5px solid rgba(80, 50, 10, 0.55)",
};

const BLACK_DISC = {
  background: "radial-gradient(circle at 35% 30%, #5c4632 0%, #2c1d10 55%, #0f0905 100%)",
  shadow: "0 2px 3px rgba(0, 0, 0, 0.55), inset 0 -1.5px 2px rgba(0, 0, 0, 0.6)",
  ring: "1.5px solid rgba(255, 230, 180, 0.5)",
};

const ANIMALS = {
  K: "🦁",
  Q: "🦅",
  R: "🐘",
  B: "🦊",
  N: "🐴",
  P: "🐰",
};

const LABELS = {
  K: "Lion",
  Q: "Eagle",
  R: "Elephant",
  B: "Fox",
  N: "Horse",
  P: "Rabbit",
};

// Build a {K,Q,...,k,q,...} labels map so captured-piece tooltips and the
// sidebar legend work for both colors without special-casing.
const labels = {};
for (const k of Object.keys(LABELS)) {
  labels[k] = LABELS[k];
  labels[k.toLowerCase()] = LABELS[k];
}

function AnimalPiece({ piece, size = "1em" }) {
  const isWhite = piece === piece.toUpperCase();
  const disc = isWhite ? WHITE_DISC : BLACK_DISC;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: disc.background,
        boxShadow: disc.shadow,
        border: disc.ring,
        position: "relative",
      }}
    >
      <span
        style={{
          fontSize: `calc(${size} * 0.72)`,
          lineHeight: 1,
          filter: isWhite ? "none" : "grayscale(0.25) brightness(0.92)",
        }}
      >
        {ANIMALS[piece.toUpperCase()]}
      </span>
    </span>
  );
}

export const animalKingdom = {
  id: "animalKingdom",
  name: "Animal Kingdom",
  renderPiece: (piece, opts = {}) => <AnimalPiece piece={piece} size={opts.size} />,
  labels,
  boardColors: {
    light: "#f2deba",
    dark: "#9c6f3f",
    border: "#3d2e20",
    coord: "#7a5a33",
  },
  sideNames: { white: "Light", black: "Dark" },
  sideEmojis: { white: "🦁", black: "🦁" },
  sideClimates: { white: "☀️", black: "🌙" },
  winText: {
    white: "The light side wins!",
    black: "The dark side wins!",
  },
};
