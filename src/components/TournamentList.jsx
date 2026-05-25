import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { createTournament, listTournaments } from "../lib/tournament.js";
import { SummitBadge } from "./SummitBadge.jsx";
import {
  cardStyle,
  errorBoxStyle,
  ghostBtnStyle,
  menuDescStyle,
  menuItemStyle,
  menuLabelStyle,
  primaryBtnStyle,
} from "./ui.js";

const STATUS_LABEL = { lobby: "Open", active: "In Progress", finished: "Finished" };
const STATUS_COLOR = {
  lobby:    "var(--success)",
  active:   "var(--accent-hover)",
  finished: "var(--text-tertiary)",
};

export function TournamentList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [err, setErr]                 = useState(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [name, setName]               = useState("");
  const [rounds, setRounds]           = useState(5);
  const [creating, setCreating]       = useState(false);

  const load = async () => {
    try {
      setTournaments(await listTournaments());
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const t = await createTournament({ name: name.trim(), roundsTotal: rounds });
      navigate(`/tournament/${t.id}`);
    } catch (e2) {
      setErr(e2.message || String(e2));
      setCreating(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", padding: "32px 20px 64px" }}>
      <div style={{ maxWidth: 600, width: "100%" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <SummitBadge size="header" showWordmark />
          <button onClick={() => navigate("/menu")} style={ghostBtnStyle}>← Back</button>
        </div>

        <h2 style={{
          fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", fontWeight: 700,
          color: "var(--text-primary)", margin: "0 0 4px", letterSpacing: "-0.02em",
          fontVariationSettings: '"SOFT" 30, "opsz" 144',
        }}>
          Tournaments
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", margin: "0 0 20px" }}>
          Swiss-system tournaments. Everyone plays every round — no eliminations.
        </p>

        {/* Create button */}
        <button
          onClick={() => setShowCreate((v) => !v)}
          style={{ ...primaryBtnStyle, width: "100%", padding: "14px 20px", fontSize: "var(--text-base)", marginBottom: 16 }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.background = "var(--primary-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.background = "var(--primary)"; }}
        >
          + New Tournament
        </button>

        {/* Create form */}
        {showCreate && (
          <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: 16 }}>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  Tournament name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Spring Championship"
                  maxLength={60}
                  required
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "10px 14px", borderRadius: "var(--radius-sm)",
                    border: "1.5px solid var(--border)", background: "var(--bg-sunk)",
                    color: "var(--text-primary)", fontSize: "var(--text-sm)",
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  Number of rounds
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[3, 4, 5, 6, 7].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRounds(n)}
                      style={{
                        padding: "8px 16px", borderRadius: "var(--radius-sm)",
                        border: "1.5px solid",
                        borderColor: rounds === n ? "var(--primary)" : "var(--border)",
                        background: rounds === n ? "var(--primary-tint)" : "var(--bg-sunk)",
                        color: rounds === n ? "var(--primary)" : "var(--text-secondary)",
                        fontWeight: 600, cursor: "pointer", fontSize: "var(--text-sm)",
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ ...ghostBtnStyle }}>Cancel</button>
                <button type="submit" disabled={creating || !name.trim()} style={{ ...primaryBtnStyle, padding: "10px 20px" }}>
                  {creating ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        )}

        {err && <div style={{ ...errorBoxStyle, marginBottom: 16 }}>{err}</div>}

        {/* Tournament list */}
        <div style={{ ...cardStyle, padding: "20px 24px" }}>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 14 }}>
            All Tournaments
          </div>

          {loading && <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)", margin: 0 }}>Loading…</p>}
          {!loading && tournaments.length === 0 && (
            <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)", margin: 0, fontStyle: "italic" }}>
              No tournaments yet. Create the first one!
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tournaments.map((t, i) => (
              <button
                key={t.id}
                onClick={() => navigate(`/tournament/${t.id}`)}
                style={{
                  ...menuItemStyle, padding: "14px 18px",
                  animation: `fadeSlideUp 0.4s var(--ease) ${i * 0.04}s both`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: "var(--radius-sm)", background: "var(--bg-sunk)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0,
                }}>
                  🏆
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={menuLabelStyle}>{t.name}</span>
                  <span style={menuDescStyle}>
                    Host: {t.host?.display_name ?? "Unknown"} · {t.rounds_total} rounds
                    {t.status === "active" && ` · Round ${t.current_round}/${t.rounds_total}`}
                  </span>
                </div>
                <span style={{
                  fontSize: "var(--text-xs)", fontWeight: 700, padding: "4px 10px",
                  borderRadius: "var(--radius-pill)", background: "var(--bg-sunk)",
                  color: STATUS_COLOR[t.status] ?? "var(--text-tertiary)",
                  flexShrink: 0,
                }}>
                  {STATUS_LABEL[t.status] ?? t.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
