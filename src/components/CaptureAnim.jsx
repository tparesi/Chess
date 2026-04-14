import { useEffect, useState } from "react";

// An ambulance zooms in, grabs the captured piece, then zooms off the board
// with the piece in tow. Plays when a capture happens — a signature kid feature.
// Takes a piece key (e.g. "P", "k") and the theme; renders through theme.renderPiece.
export function CaptureAnim({ pieceKey, theme, row, col, onDone }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 60),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1550),
      setTimeout(() => onDone(), 2200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  const translate =
    phase === 0
      ? `translateX(${(col - 3) * 100}%)`
      : phase === 1
        ? `translateX(${col * 100}%)`
        : `translateX(${(col + 10) * 100}%)`;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 50,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: `${row * 12.5}%`,
          left: 0,
          width: "12.5%",
          height: "12.5%",
          transform: translate,
          transition:
            phase === 0
              ? "none"
              : phase <= 1
                ? "transform .8s cubic-bezier(.25,0,.2,1)"
                : "transform .6s cubic-bezier(.5,0,1,1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 52,
        }}
      >
        <span
          style={{
            fontSize: "clamp(22px,5.5vw,40px)",
            transform: "scaleX(-1)",
            animation:
              phase >= 1 && phase < 4 ? "sirenPulse .3s infinite alternate" : "none",
          }}
        >
          🚑
        </span>
        {phase >= 2 && (
          <span
            style={{
              position: "absolute",
              top: "-35%",
              display: "inline-flex",
              animation: "animalBounce .35s ease-in-out infinite alternate",
            }}
          >
            {theme.renderPiece(pieceKey, { size: "clamp(13px,3.2vw,22px)" })}
          </span>
        )}
      </div>
      {phase < 2 && (
        <div
          style={{
            position: "absolute",
            top: `${row * 12.5}%`,
            left: `${col * 12.5}%`,
            width: "12.5%",
            height: "12.5%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 51,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              animation: phase === 1 ? "animalWobble .2s infinite alternate" : "none",
            }}
          >
            {theme.renderPiece(pieceKey, { size: "clamp(18px,4.5vw,32px)" })}
          </span>
        </div>
      )}
      {phase === 2 && (
        <div
          style={{
            position: "absolute",
            top: `${Math.max(0, row * 12.5 - 5)}%`,
            left: `${col * 12.5}%`,
            width: "12.5%",
            textAlign: "center",
            zIndex: 53,
            animation: "rescuedPop .65s ease-out forwards",
          }}
        >
          <span
            style={{
              background: "linear-gradient(135deg,#22c55e,#16a34a)",
              color: "#fff",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: "clamp(7px,1.6vw,11px)",
              fontWeight: 700,
              boxShadow: "0 2px 8px rgba(0,0,0,.4)",
            }}
          >
            RESCUED!
          </span>
        </div>
      )}
    </div>
  );
}
