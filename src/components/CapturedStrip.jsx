// A horizontal shelf showing a player's name and the pieces they've captured.
// Used in both AIGame and GameRoom, above/below the board.

export function CapturedStrip({ name, pieces, theme, sqWidth, self = false }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: sqWidth,
        minHeight: 32,
        padding: "6px 12px",
        background: "var(--bg-sunk)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        gap: 10,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-xs)",
          color: self ? "var(--primary)" : "var(--text-secondary)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "40%",
        }}
      >
        {name}
      </span>
      <div style={{ display: "flex", gap: 3, alignItems: "center", flex: 1, justifyContent: "flex-end" }}>
        {pieces.length === 0 ? (
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-tertiary)",
              fontStyle: "italic",
              fontFamily: "var(--font-body)",
            }}
          >
            —
          </span>
        ) : (
          pieces.map((p, i) => (
            <span key={i} style={{ display: "inline-flex", opacity: 0.9 }}>
              {theme.renderPiece(p, { size: "20px" })}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
