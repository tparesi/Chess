import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { loadLeaderboard } from "../lib/games.js";
import { btnStyle, cardStyle, screenStyle } from "./ui.js";

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
    <div style={screenStyle}>
      <div style={{ maxWidth: 520, width: "100%" }}>
        <button
          onClick={() => navigate("/menu")}
          style={{ ...btnStyle, marginBottom: 16 }}
        >
          ← Back
        </button>
        <h2
          style={{
            fontFamily: "'Libre Baskerville',serif",
            fontSize: 24,
            color: "#e7e5e4",
            margin: "0 0 4px",
            textAlign: "center",
          }}
        >
          Leaderboard
        </h2>
        <p style={{ color: "#78716c", fontSize: 12, textAlign: "center", margin: "0 0 16px" }}>
          Ranked by ELO
        </p>

        {err && (
          <div
            style={{
              background: "#7f1d1d",
              border: "1px solid #dc2626",
              color: "#fecaca",
              fontSize: 12,
              padding: 10,
              borderRadius: 6,
              marginBottom: 12,
            }}
          >
            {err}
          </div>
        )}

        {loading ? (
          <p style={{ color: "#78716c", textAlign: "center" }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p style={{ color: "#57534e", textAlign: "center", fontStyle: "italic" }}>
            No players yet
          </p>
        ) : (
          <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 60px 40px 40px 40px",
                padding: "8px 12px",
                borderBottom: "1px solid #3a3025",
                fontSize: 10,
                color: "#78716c",
                textTransform: "uppercase",
                letterSpacing: ".08em",
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
                    gridTemplateColumns: "40px 1fr 60px 40px 40px 40px",
                    padding: "8px 12px",
                    borderBottom: i < rows.length - 1 ? "1px solid #3a3025" : "none",
                    fontSize: 12,
                    color: "#e7e5e4",
                    background: isMe ? "rgba(251,191,36,.08)" : "transparent",
                  }}
                >
                  <span
                    style={{
                      color:
                        i === 0
                          ? "#fbbf24"
                          : i === 1
                            ? "#94a3b8"
                            : i === 2
                              ? "#b45309"
                              : "#78716c",
                      fontWeight: i < 3 ? 700 : 400,
                    }}
                  >
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </span>
                  <span style={{ fontWeight: 500 }}>{row.display_name}</span>
                  <span style={{ color: "#fbbf24" }}>{row.elo}</span>
                  <span style={{ color: "#22c55e" }}>{row.wins}</span>
                  <span style={{ color: "#ef4444" }}>{row.losses}</span>
                  <span style={{ color: "#a8a29e" }}>{row.draws}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
