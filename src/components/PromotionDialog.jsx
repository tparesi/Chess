export function PromotionDialog({ theme, turn, onPick }) {
  const pieces = ["Q", "R", "B", "N"];
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg-overlay)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        animation: "fadeIn 0.25s var(--ease) both",
      }}
    >
      <div
        style={{
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "24px 28px",
          textAlign: "center",
          boxShadow: "var(--shadow-lg)",
          animation: "summitDrop 0.5s var(--ease-overshoot) both",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-display)",
            margin: "0 0 18px",
            fontSize: "var(--text-md)",
            color: "var(--text-primary)",
            fontWeight: 600,
          }}
        >
          Promote your pawn
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          {pieces.map((p) => {
            const key = turn === "white" ? p : p.toLowerCase();
            return (
              <button
                key={p}
                onClick={() => onPick(p)}
                style={{
                  background: "var(--bg-sunk)",
                  border: "1.5px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "12px 16px",
                  cursor: "pointer",
                  lineHeight: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "var(--font-body)",
                  transition: "all var(--dur) var(--ease)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--primary)";
                  e.currentTarget.style.background = "var(--primary-tint)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "var(--bg-sunk)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {theme.renderPiece(key, { size: "44px" })}
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {theme.labels[p]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
