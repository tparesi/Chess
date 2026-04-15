import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useProfile } from "../hooks/useProfile.js";
import { signOut } from "../lib/auth.js";
import { SummitBadge } from "./SummitBadge.jsx";
import {
  ghostBtnStyle,
  menuDescStyle,
  menuItemStyle,
  menuLabelStyle,
} from "./ui.js";

const items = [
  {
    path: "/play",
    label: "Play",
    desc: "Challenge a classmate online or train against the AI",
    icon: "⚔️",
    hero: true,
  },
  { path: "/puzzles", label: "Puzzle Book", desc: "150 puzzles, learn by solving", icon: "📖" },
  { path: "/leaderboard", label: "Leaderboard", desc: "See who's on top", icon: "🏔️" },
  { path: "/feedback", label: "Send Feedback", desc: "Tell me what to build next", icon: "💬" },
];

export function Menu() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

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
        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 28,
            animation: "fadeSlideUp 0.5s var(--ease) both",
          }}
        >
          <SummitBadge
            size="header"
            showWordmark
            subtitle="leading the climb"
          />
          <button onClick={handleSignOut} style={ghostBtnStyle} title="Sign out">
            Sign out
          </button>
        </div>

        {/* Welcome + stat strip */}
        <div
          style={{
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "24px 28px",
            marginBottom: 24,
            boxShadow: "var(--shadow-sm)",
            animation: "fadeSlideUp 0.5s var(--ease) 0.08s both",
          }}
        >
          <div
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
              marginBottom: 2,
            }}
          >
            Welcome back,
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "var(--text-lg)",
              color: "var(--text-primary)",
              letterSpacing: "-0.015em",
              marginBottom: 18,
              fontVariationSettings: '"SOFT" 30, "opsz" 144',
            }}
          >
            {profile?.display_name ?? "…"}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
            }}
          >
            <Stat label="ELO" value={profile?.elo ?? "—"} accent />
            <Stat label="Wins" value={profile?.wins ?? 0} positive />
            <Stat label="Losses" value={profile?.losses ?? 0} />
          </div>
        </div>

        {/* Menu tiles */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((m, i) => (
            <button
              key={m.path}
              onClick={() => navigate(m.path)}
              style={{
                ...menuItemStyle,
                padding: m.hero ? "28px 28px" : "20px 24px",
                animation: `fadeSlideUp 0.5s var(--ease) ${0.15 + i * 0.06}s both`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
                e.currentTarget.style.borderColor = "var(--primary-tint-strong)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              <div
                style={{
                  width: m.hero ? 56 : 44,
                  height: m.hero ? 56 : 44,
                  borderRadius: "var(--radius-sm)",
                  background: m.hero ? "var(--primary-tint)" : "var(--bg-sunk)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: m.hero ? 28 : 22,
                  flexShrink: 0,
                }}
              >
                {m.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ ...menuLabelStyle, fontSize: m.hero ? "var(--text-lg)" : "var(--text-md)" }}>
                  {m.label}
                </span>
                <span style={menuDescStyle}>{m.desc}</span>
              </div>
              {m.hero && (
                <span
                  style={{
                    background: "var(--accent-tint)",
                    color: "var(--accent-hover)",
                    fontSize: "var(--text-xs)",
                    fontWeight: 600,
                    padding: "6px 12px",
                    borderRadius: "var(--radius-pill)",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Start
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent, positive }) {
  return (
    <div
      style={{
        background: "var(--bg-sunk)",
        borderRadius: "var(--radius-sm)",
        padding: "10px 14px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "var(--text-lg)",
          color: accent
            ? "var(--primary)"
            : positive && value > 0
              ? "var(--success)"
              : "var(--text-primary)",
          lineHeight: 1,
          fontVariationSettings: '"opsz" 144',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginTop: 4,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
    </div>
  );
}
