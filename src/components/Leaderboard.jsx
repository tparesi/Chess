import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { loadLeaderboard } from "../lib/games.js";
import { SummitBadge } from "./SummitBadge.jsx";
import { cardStyle, errorBoxStyle, ghostBtnStyle } from "./ui.js";

export function Leaderboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    loadLeaderboard()
      .then(setRows)
      .catch((e) => setErr(e.message || String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        padding: "32px 20px 64px",
      }}
    >
      <div style={{ maxWidth: 600, width: "100%" }}>
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
          Leaderboard
        </h2>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "var(--text-sm)",
            margin: "0 0 24px",
          }}
        >
          Ranked by ELO — keep climbing.
        </p>

        {err && <div style={{ ...errorBoxStyle, marginBottom: 16 }}>{err}</div>}

        {loading ? (
          <p style={{ color: "var(--text-tertiary)", textAlign: "center" }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p
            style={{
              color: "var(--text-tertiary)",
              textAlign: "center",
              fontStyle: "italic",
            }}
          >
            No players yet — sign up a friend!
          </p>
        ) : (
          <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "48px 1fr 68px 44px 44px 44px",
                padding: "14px 20px",
                borderBottom: "1px solid var(--border)",
                fontSize: "var(--text-xs)",
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontWeight: 600,
                background: "var(--bg-sunk)",
              }}
            >
              <span>#</span>
              <span>Name</span>
              <span>ELO</span>
              <span>W</span>
              <span>L</span>
              <span>D</span>
            </div>
            {rows.map((row, i) => {
              const isMe = user?.id === row.id;
              return (
                <div
                  key={row.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "48px 1fr 68px 44px 44px 44px",
                    alignItems: "center",
                    padding: "14px 20px",
                    borderBottom:
                      i < rows.length - 1 ? "1px solid var(--border)" : "none",
                    fontSize: "var(--text-sm)",
                    color: "var(--text-primary)",
                    background: isMe ? "var(--accent-tint)" : "transparent",
                    animation: `fadeSlideUp 0.3s var(--ease) ${i * 0.03}s both`,
                  }}
                >
                  <span
                    style={{
                      fontSize: i < 3 ? 22 : "var(--text-sm)",
                      color:
                        i === 0
                          ? "var(--accent)"
                          : i === 1
                            ? "var(--text-secondary)"
                            : i === 2
                              ? "var(--board-dark)"
                              : "var(--text-tertiary)",
                      fontWeight: i < 3 ? 700 : 500,
                    }}
                  >
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </span>
                  <span
                    style={{
                      fontWeight: 500,
                      fontFamily: isMe ? "var(--font-display)" : "var(--font-body)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.display_name}
                    {isMe && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: "var(--text-xs)",
                          color: "var(--accent)",
                          fontWeight: 600,
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        YOU
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      color: "var(--primary)",
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "var(--text-md)",
                      fontVariationSettings: '"opsz" 144',
                    }}
                  >
                    {row.elo}
                  </span>
                  <span style={{ color: "var(--success)" }}>{row.wins}</span>
                  <span style={{ color: "var(--error)" }}>{row.losses}</span>
                  <span style={{ color: "var(--text-tertiary)" }}>{row.draws}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
