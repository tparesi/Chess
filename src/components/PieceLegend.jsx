// Sidebar reference card: shows each piece type rendered in the current
// theme alongside its standard chess name and point value. Used in both
// AIGame and GameRoom sidebars so kids always have the vocabulary at hand.

const STANDARD_NAMES = {
  K: "King",
  Q: "Queen",
  R: "Rook",
  B: "Bishop",
  N: "Knight",
  P: "Pawn",
};

const POINT_VALUES = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
const PIECES = ["K", "Q", "R", "B", "N", "P"];

export function PieceLegend({ theme }) {
  return (
    <div
      style={{
        borderTop: "1px solid var(--border)",
        padding: "12px 16px",
        background: "var(--bg-sunk)",
      }}
    >
      <span
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontWeight: 600,
          display: "block",
          marginBottom: 8,
        }}
      >
        Pieces
      </span>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px" }}>
        {PIECES.map((p) => (
          <div key={p} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-flex" }}>
              {theme.renderPiece(p, { size: "20px" })}
            </span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
              {STANDARD_NAMES[p]}
              {POINT_VALUES[p] > 0 && (
                <span style={{ color: "var(--text-tertiary)", marginLeft: 4 }}>
                  ({POINT_VALUES[p]})
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
