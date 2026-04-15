// Sidebar section that shows the latest observational coach tip.
// Matches the styling of the Moves / Pieces sections in the AIGame and
// GameRoom sidebar card.

export function CoachPanel({ tip }) {
  const kind = tip?.kind ?? "neutral";
  const icon = kind === "positive" ? "✨" : kind === "warning" ? "⚠️" : "🧠";
  const accent =
    kind === "positive"
      ? "var(--success)"
      : kind === "warning"
        ? "var(--error)"
        : "var(--text-tertiary)";

  return (
    <div
      style={{
        borderTop: "1px solid var(--border)",
        padding: "12px 16px",
        background: "var(--bg-sunk)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontWeight: 600,
          }}
        >
          Coach
        </span>
      </div>
      {tip ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            animation: "fadeIn 0.3s var(--ease)",
          }}
          key={tip.id + tip.message}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "var(--text-sm)",
                color: accent,
                lineHeight: 1.2,
                marginBottom: 2,
                letterSpacing: "-0.01em",
              }}
            >
              {tip.title}
            </div>
            <div
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-secondary)",
                lineHeight: 1.45,
              }}
            >
              {tip.message}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 16, opacity: 0.6 }}>🧠</span>
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-tertiary)",
              fontStyle: "italic",
            }}
          >
            Keep thinking.
          </div>
        </div>
      )}
    </div>
  );
}
