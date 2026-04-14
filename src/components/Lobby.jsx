import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { createGame, joinGame, listOpenGames } from "../lib/games.js";
import { supabase } from "../lib/supabase.js";
import {
  btnStyle,
  cardStyle,
  menuDescStyle,
  menuItemStyle,
  menuLabelStyle,
  primaryBtnStyle,
  screenStyle,
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
    <div style={screenStyle}>
      <div style={{ maxWidth: 520, width: "100%" }}>
        <button onClick={() => navigate("/play")} style={{ ...btnStyle, marginBottom: 16 }}>
          ← Back
        </button>
        <h2
          style={{
            fontFamily: "'Libre Baskerville',serif",
            fontSize: 22,
            margin: "0 0 4px",
            textAlign: "center",
          }}
        >
          Online Lobby
        </h2>
        <p style={{ color: "#78716c", fontSize: 12, textAlign: "center", margin: "0 0 16px" }}>
          Create a game and wait for someone to join, or join an open one
        </p>

        <button
          onClick={handleNewGame}
          style={{ ...primaryBtnStyle, width: "100%", padding: 12, fontSize: 14, marginBottom: 16 }}
        >
          + New Game
        </button>

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

        <div style={cardStyle}>
          <h3
            style={{
              fontFamily: "'Libre Baskerville',serif",
              fontSize: 12,
              color: "#a8a29e",
              textTransform: "uppercase",
              letterSpacing: ".08em",
              margin: "0 0 10px",
            }}
          >
            Open Games
          </h3>

          {loading && <p style={{ color: "#78716c", fontSize: 12, margin: 0 }}>Loading…</p>}
          {!loading && games.length === 0 && (
            <p style={{ color: "#57534e", fontSize: 12, margin: 0, fontStyle: "italic" }}>
              No open games. Create one!
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {games.map((g) => {
              const isMine = g.white_id === user?.id;
              return (
                <button
                  key={g.id}
                  onClick={() => (isMine ? navigate(`/game/${g.id}`) : handleJoin(g.id))}
                  style={{
                    ...menuItemStyle,
                    padding: "10px 14px",
                    opacity: isMine ? 0.7 : 1,
                  }}
                >
                  <span style={{ fontSize: 20, minWidth: 28 }}>♟️</span>
                  <div style={{ flex: 1 }}>
                    <span style={menuLabelStyle}>
                      {g.profiles?.display_name ?? "Unknown"}
                      <span style={{ color: "#78716c", fontWeight: 400, fontSize: 11, marginLeft: 6 }}>
                        (ELO {g.profiles?.elo ?? 1000})
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
