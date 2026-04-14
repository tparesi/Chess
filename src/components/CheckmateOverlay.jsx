import { btnStyle, primaryBtnStyle } from "./ui.js";

export function CheckmateOverlay({
  winner,
  winnerName,
  loserName,
  theme,
  tips,
  eloDelta,
  onReplay,
  onMenu,
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        animation: "fadeIn .5s ease-out",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: 420,
          width: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 20,
        }}
      >
        <div
          style={{
            animation: "crownDrop .8s cubic-bezier(.17,.89,.32,1.28) forwards",
            display: "inline-flex",
            marginBottom: 8,
          }}
        >
          {theme.renderPiece(winner === "white" ? "K" : "k", { size: "72px" })}
        </div>
        <div
          style={{
            animation: "crownDrop 1s cubic-bezier(.17,.89,.32,1.28) forwards",
            fontSize: 48,
            marginBottom: 4,
          }}
        >
          👑
        </div>
        <h2
          style={{
            fontFamily: "'Libre Baskerville',serif",
            fontSize: "clamp(20px,4vw,28px)",
            color: "#fbbf24",
            margin: "8px 0 4px",
            animation: "fadeSlideUp .6s ease-out .3s both",
          }}
        >
          {winnerName ? `${winnerName} wins!` : `${theme.sideNames[winner]} wins!`}
        </h2>
        {loserName && (
          <p
            style={{
              color: "#a8a29e",
              fontSize: 13,
              margin: "0 0 16px",
              animation: "fadeSlideUp .6s ease-out .5s both",
            }}
          >
            {winnerName ?? "Light"} defeats {loserName}
          </p>
        )}

        {eloDelta != null && (
          <p
            style={{
              color: eloDelta >= 0 ? "#22c55e" : "#ef4444",
              fontSize: 14,
              fontWeight: 700,
              margin: "0 0 12px",
              animation: "fadeSlideUp .6s ease-out .6s both",
            }}
          >
            {eloDelta >= 0 ? `+${eloDelta}` : eloDelta} ELO
          </p>
        )}

        <div
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
            zIndex: -1,
          }}
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "-10%",
                left: `${Math.random() * 100}%`,
                width: 8,
                height: 8,
                borderRadius: Math.random() > 0.5 ? "50%" : "0",
                background: ["#fbbf24", "#22c55e", "#ef4444", "#3b82f6", "#a855f7"][i % 5],
                animation: `confetti ${2 + Math.random() * 2}s linear ${Math.random() * 0.5}s infinite`,
                opacity: 0.8,
              }}
            />
          ))}
        </div>

        {tips && tips.length > 0 && (
          <div style={{ textAlign: "left", animation: "fadeSlideUp .6s ease-out .7s both" }}>
            <h3
              style={{
                color: "#d4d4d8",
                fontSize: 14,
                margin: "16px 0 8px",
                fontFamily: "'Libre Baskerville',serif",
              }}
            >
              Coaching Tips
            </h3>
            {tips.map((t, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,.05)",
                  border: "1px solid #3a3025",
                  borderRadius: 6,
                  padding: "10px 12px",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#fbbf24",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  {t.title}
                </span>
                <p style={{ fontSize: 11, color: "#d4d4d8", margin: "0 0 6px", lineHeight: 1.5 }}>
                  {t.tip}
                </p>
                {t.url && (
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 10,
                      color: "#60a5fa",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {t.urlLabel ?? "Learn more"} →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            marginTop: 16,
            animation: "fadeSlideUp .6s ease-out .9s both",
          }}
        >
          {onReplay && (
            <button onClick={onReplay} style={primaryBtnStyle}>
              Play Again
            </button>
          )}
          <button onClick={onMenu} style={btnStyle}>
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}
