export function PromotionDialog({ theme, turn, onPick }) {
  const pieces = ["Q", "R", "B", "N"];
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: "#292118",
          border: "1px solid #5c4a2e",
          borderRadius: 10,
          padding: "20px 24px",
          textAlign: "center",
        }}
      >
        <p style={{ margin: "0 0 14px", fontSize: 14, color: "#a8a29e" }}>Promote your pawn to:</p>
        <div style={{ display: "flex", gap: 10 }}>
          {pieces.map((p) => {
            const key = turn === "white" ? p : p.toLowerCase();
            return (
              <button
                key={p}
                onClick={() => onPick(p)}
                style={{
                  background: "#3a3025",
                  border: "1px solid #5c4a2e",
                  borderRadius: 8,
                  padding: "8px 12px",
                  cursor: "pointer",
                  lineHeight: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                {theme.renderPiece(key, { size: "40px" })}
                <span style={{ fontSize: 9, color: "#a8a29e", display: "block", marginTop: 4 }}>
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
