import { SummitBadge } from "./SummitBadge.jsx";
import { btnStyle, primaryBtnStyle } from "./ui.js";

export function CheckmateOverlay({
  winner,
  winnerName,
  loserName,
  theme,
  eloDelta,
  onReplay,
  onMenu,
}) {
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
        zIndex: 200,
        animation: "fadeIn 0.4s var(--ease) both",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "32px 36px 28px",
          textAlign: "center",
          maxWidth: 440,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "var(--shadow-xl)",
          animation: "summitDrop 0.6s var(--ease-overshoot) both",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <SummitBadge size={64} />
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "var(--accent-tint)",
            marginBottom: 16,
            animation: "crownDrop 0.8s var(--ease-overshoot) 0.15s both",
          }}
        >
          <div style={{ display: "inline-flex", position: "relative" }}>
            {theme.renderPiece(winner === "white" ? "K" : "k", { size: "52px" })}
          </div>
        </div>

        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-xl)",
            color: "var(--text-primary)",
            margin: "8px 0 4px",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            fontVariationSettings: '"SOFT" 50, "opsz" 144',
            animation: "fadeSlideUp 0.5s var(--ease) 0.3s both",
          }}
        >
          {winnerName ? `${winnerName} wins!` : `${theme.sideNames[winner]} wins!`}
        </h2>
        {loserName && (
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              color: "var(--text-secondary)",
              fontSize: "var(--text-sm)",
              margin: "0 0 16px",
              animation: "fadeSlideUp 0.5s var(--ease) 0.4s both",
            }}
          >
            {winnerName ?? "Someone"} defeats {loserName}
          </p>
        )}

        {eloDelta != null && (
          <div
            style={{
              display: "inline-block",
              padding: "8px 16px",
              borderRadius: "var(--radius-pill)",
              background: eloDelta >= 0 ? "var(--success-tint)" : "var(--error-tint)",
              color: eloDelta >= 0 ? "var(--success)" : "var(--error)",
              fontSize: "var(--text-sm)",
              fontWeight: 700,
              marginBottom: 16,
              animation: "fadeSlideUp 0.5s var(--ease) 0.5s both",
            }}
          >
            {eloDelta >= 0 ? `+${eloDelta}` : eloDelta} ELO
          </div>
        )}

        {/* Confetti */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
            zIndex: -1,
          }}
        >
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "-10%",
                left: `${Math.random() * 100}%`,
                width: 9,
                height: 9,
                borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                background: [
                  "var(--primary)",
                  "var(--accent)",
                  "var(--success)",
                  "var(--border-strong)",
                  "var(--primary)",
                ][i % 5],
                animation: `confetti ${2.2 + Math.random() * 2}s linear ${Math.random() * 0.5}s infinite`,
                opacity: 0.85,
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            marginTop: 20,
            animation: "fadeSlideUp 0.5s var(--ease) 0.6s both",
          }}
        >
          {onReplay && (
            <button
              onClick={onReplay}
              style={{ ...primaryBtnStyle, padding: "12px 24px", fontSize: "var(--text-sm)" }}
            >
              Play Again
            </button>
          )}
          <button
            onClick={onMenu}
            style={{ ...btnStyle, padding: "12px 24px", fontSize: "var(--text-sm)" }}
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
}
