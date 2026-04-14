import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { createGame, joinGame, listOpenGames } from "../lib/games.js";
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
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const reload = async () => {
    try {
      const rows = await listOpenGames();
      setGames(rows);
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
      .subscribe();
    return () => {
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
          Create a game and wait for someone to join — or jump into an open one.
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
            Open Games
          </div>

          {loading && (
            <p style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)", margin: 0 }}>
              Loading…
            </p>
          )}
          {!loading && games.length === 0 && (
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
            {games.map((g, i) => {
              const isMine = g.white_id === user?.id;
              return (
                <button
                  key={g.id}
                  onClick={() => (isMine ? navigate(`/game/${g.id}`) : handleJoin(g.id))}
                  style={{
                    ...menuItemStyle,
                    padding: "14px 18px",
                    opacity: isMine ? 0.75 : 1,
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
                      {g.profiles?.display_name ?? "Unknown"}
                      <span
                        style={{
                          color: "var(--text-tertiary)",
                          fontWeight: 500,
                          fontSize: "var(--text-xs)",
                          marginLeft: 8,
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        ELO {g.profiles?.elo ?? 1000}
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
