import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { createGame, joinGame, listLobbyGames } from "../lib/games.js";
import { supabase } from "../lib/supabase.js";
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

export function Lobby() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState([]);
  const [inProgress, setInProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const reload = async () => {
    try {
      const rows = await listLobbyGames();
      setOpen(rows.open);
      setInProgress(rows.inProgress);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();

    const channel = supabase
      .channel("lobby")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games" },
        () => reload()
      )
      .subscribe((status, err2) => {
        if (err2) console.error("[lobby realtime] error", err2);
        else console.log("[lobby realtime] status:", status);
      });

    // Polling fallback — realtime is the primary channel but this keeps
    // the list fresh even if the subscription drops.
    const pollId = setInterval(reload, 5000);

    return () => {
      clearInterval(pollId);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewGame = async () => {
    try {
      const game = await createGame();
      navigate(`/game/${game.id}`);
    } catch (e) {
      setErr(e.message || String(e));
    }
  };

  const handleJoin = async (gameId) => {
    try {
      await joinGame(gameId);
      navigate(`/game/${gameId}`);
    } catch (e) {
      setErr(e.message || String(e));
    }
  };

  const opponentOf = (g) =>
    user?.id === g.white_id ? g.black : g.white;
  const myColorIn = (g) =>
    user?.id === g.white_id ? "white" : "black";

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
          <button onClick={() => navigate("/play")} style={ghostBtnStyle}>
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
          Online Lobby
        </h2>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "var(--text-sm)",
            margin: "0 0 20px",
          }}
        >
          Resume a game in progress, join an open challenge, or start a new one.
        </p>

        <button
          onClick={handleNewGame}
          style={{
            ...primaryBtnStyle,
            width: "100%",
            padding: "14px 20px",
            fontSize: "var(--text-base)",
            marginBottom: 20,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.background = "var(--primary-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.background = "var(--primary)";
          }}
        >
          + New Game
        </button>

        {err && <div style={{ ...errorBoxStyle, marginBottom: 16 }}>{err}</div>}

        {/* Your games in progress */}
        {inProgress.length > 0 && (
          <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--accent)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  fontWeight: 700,
                }}
              >
                Your Games in Progress
              </span>
              <span
                style={{
                  background: "var(--accent-tint)",
                  color: "var(--accent-hover)",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "var(--radius-pill)",
                }}
              >
                {inProgress.length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {inProgress.map((g, i) => {
                const opp = opponentOf(g);
                const myColor = myColorIn(g);
                const yourTurn = g.turn === myColor;
                return (
                  <button
                    key={g.id}
                    onClick={() => navigate(`/game/${g.id}`)}
                    style={{
                      ...menuItemStyle,
                      padding: "14px 18px",
                      borderColor: yourTurn ? "var(--accent)" : "var(--border)",
                      background: yourTurn ? "var(--accent-tint)" : "var(--bg-raised)",
                      animation: `fadeSlideUp 0.4s var(--ease) ${i * 0.04}s both`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "var(--shadow-md)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "var(--radius-sm)",
                        background: "var(--bg-raised)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        flexShrink: 0,
                        boxShadow: "var(--shadow-xs)",
                      }}
                    >
                      ⏳
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={menuLabelStyle}>
                        vs {opp?.display_name ?? "Unknown"}
                        <span
                          style={{
                            color: "var(--text-tertiary)",
                            fontWeight: 500,
                            fontSize: "var(--text-xs)",
                            marginLeft: 8,
                            fontFamily: "var(--font-body)",
                          }}
                        >
                          ELO {opp?.elo ?? 1000}
                        </span>
                      </span>
                      <span style={menuDescStyle}>
                        {yourTurn ? "Your turn — tap to play" : "Waiting on opponent"}
                      </span>
                    </div>
                    <span
                      style={{
                        color: "var(--accent-hover)",
                        fontSize: "var(--text-md)",
                        fontWeight: 700,
                      }}
                    >
                      →
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Open challenges */}
        <div style={{ ...cardStyle, padding: "20px 24px" }}>
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              fontWeight: 600,
              marginBottom: 14,
            }}
          >
            Open Challenges
          </div>

          {loading && (
            <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)", margin: 0 }}>
              Loading…
            </p>
          )}
          {!loading && open.length === 0 && (
            <p
              style={{
                color: "var(--text-tertiary)",
                fontSize: "var(--text-sm)",
                margin: 0,
                fontStyle: "italic",
              }}
            >
              No open games yet. Be the first!
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {open.map((g, i) => {
              const isMine = g.white_id === user?.id;
              return (
                <button
                  key={g.id}
                  onClick={() => (isMine ? navigate(`/game/${g.id}`) : handleJoin(g.id))}
                  style={{
                    ...menuItemStyle,
                    padding: "14px 18px",
                    opacity: isMine ? 0.8 : 1,
                    animation: `fadeSlideUp 0.4s var(--ease) ${i * 0.04}s both`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.borderColor = "var(--primary-tint-strong)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "var(--radius-sm)",
                      background: "var(--primary-tint)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    ♟️
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={menuLabelStyle}>
                      {g.white?.display_name ?? "Unknown"}
                      <span
                        style={{
                          color: "var(--text-tertiary)",
                          fontWeight: 500,
                          fontSize: "var(--text-xs)",
                          marginLeft: 8,
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        ELO {g.white?.elo ?? 1000}
                      </span>
                    </span>
                    <span style={menuDescStyle}>
                      {isMine ? "Your game — waiting for opponent" : "Tap to join"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
