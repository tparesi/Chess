import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useProfile } from "../hooks/useProfile.js";
import { AI_ELO, applyResult } from "../lib/elo.js";
import { SummitBadge } from "./SummitBadge.jsx";
import {
  ghostBtnStyle,
  menuDescStyle,
  menuItemStyle,
  menuLabelStyle,
} from "./ui.js";

const AI_MODES = [
  {
    id: "beginner",
    label: "Beginner AI",
    desc: "Mostly random — good for warming up",
    icon: "🌱",
    path: "/play/ai/beginner",
  },
  {
    id: "easy",
    label: "Easy AI",
    desc: "Sees 1 move ahead — a solid first challenge",
    icon: "🧠",
    path: "/play/ai/easy",
  },
  {
    id: "medium",
    label: "Medium AI",
    desc: "Sees 2 moves ahead — plays real tactics",
    icon: "🔥",
    path: "/play/ai/medium",
  },
  {
    id: "hard",
    label: "Hard AI",
    desc: "Sees 3 moves ahead — test your best",
    icon: "⚡",
    path: "/play/ai/hard",
  },
];

function EloPreview({ playerElo, difficulty }) {
  if (playerElo == null) return null;
  const aiElo = AI_ELO[difficulty];
  const { whiteDelta: winDelta } = applyResult(playerElo, aiElo, "white");
  const { whiteDelta: lossDelta } = applyResult(playerElo, aiElo, "black");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 2,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
        <span style={{ color: "#22c55e", fontWeight: 600 }}>
          {winDelta > 0 ? `+${winDelta}` : winDelta}
        </span>
        {" / "}
        <span style={{ color: "#ef4444", fontWeight: 600 }}>
          {lossDelta}
        </span>
      </span>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary, var(--text-secondary))", whiteSpace: "nowrap" }}>
        W / L
      </span>
    </div>
  );
}

export function PlayMenu() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const playerElo = profile?.elo ?? null;

  const allModes = [
    {
      id: "online",
      label: "Online PvP",
      desc: "Play live against a classmate — affects ELO",
      icon: "🌐",
      path: "/lobby",
      accent: true,
    },
    ...AI_MODES,
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        padding: "32px 20px 64px",
      }}
    >
      <div style={{ maxWidth: 560, width: "100%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 28,
          }}
        >
          <SummitBadge size="header" showWordmark />
          <button onClick={() => navigate("/menu")} style={ghostBtnStyle}>
            ← Back
          </button>
        </div>

        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-lg)",
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: "0 0 4px",
            letterSpacing: "-0.02em",
            fontVariationSettings: '"SOFT" 30, "opsz" 144',
          }}
        >
          Choose your match
        </h2>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "var(--text-sm)",
            margin: "0 0 24px",
          }}
        >
          Online games count for ELO.
          {playerElo != null && (
            <> Your current ELO: <strong style={{ color: "var(--text-primary)" }}>{playerElo}</strong></>
          )}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {allModes.map((m, i) => (
            <button
              key={m.id}
              onClick={() => navigate(m.path)}
              style={{
                ...menuItemStyle,
                border: m.accent ? "1.5px solid var(--primary-tint-strong)" : menuItemStyle.border,
                background: m.accent ? "var(--primary-tint)" : menuItemStyle.background,
                animation: `fadeSlideUp 0.5s var(--ease) ${i * 0.06}s both`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "var(--radius-sm)",
                  background: m.accent ? "var(--bg-raised)" : "var(--bg-sunk)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  flexShrink: 0,
                  boxShadow: m.accent ? "var(--shadow-xs)" : "none",
                }}
              >
                {m.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={menuLabelStyle}>{m.label}</span>
                <span style={menuDescStyle}>{m.desc}</span>
              </div>
              {m.accent ? (
                <span
                  style={{
                    color: "var(--primary)",
                    fontSize: "var(--text-md)",
                    fontWeight: 700,
                  }}
                >
                  →
                </span>
              ) : (
                <EloPreview playerElo={playerElo} difficulty={m.id} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
