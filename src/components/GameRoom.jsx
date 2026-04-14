import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { colorOf, FILES } from "../chess/board.js";
import {
  hasLegalMove,
  isInCheck,
  legalMoves,
  simulateMove,
} from "../chess/moves.js";
import { generateTips } from "../chess/tips.js";
import { useAuth } from "../hooks/useAuth.js";
import { finalizePvpMatch, getGame, submitMove } from "../lib/games.js";
import { supabase } from "../lib/supabase.js";
import { getTheme, DEFAULT_THEME_ID } from "../themes/index.js";
import { CheckmateOverlay } from "./CheckmateOverlay.jsx";
import { GameBoard, SQ } from "./GameBoard.jsx";
import { PromotionDialog } from "./PromotionDialog.jsx";
import { btnStyle, cardStyle } from "./ui.js";

export function GameRoom() {
  const { id: gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = getTheme(DEFAULT_THEME_ID);

  const [game, setGame] = useState(null);
  const [err, setErr] = useState(null);
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [pendingPromo, setPendingPromo] = useState(null);
  const [overlay, setOverlay] = useState(null);
  const finalizedRef = useRef(false);

  const myColor = useMemo(() => {
    if (!game || !user) return null;
    if (game.white_id === user.id) return "white";
    if (game.black_id === user.id) return "black";
    return null;
  }, [game, user]);

  const isMyTurn = !!myColor && game?.turn === myColor && game?.status === "active";
  const flipped = myColor === "black";

  // Initial load
  useEffect(() => {
    getGame(gameId)
      .then(setGame)
      .catch((e) => setErr(e.message || String(e)));
  }, [gameId]);

  // Realtime subscription
  useEffect(() => {
    if (!gameId) return;
    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (payload) => {
          setGame((prev) => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  // Detect game end and finalize
  useEffect(() => {
    if (!game || game.status !== "finished" || finalizedRef.current) return;
    finalizedRef.current = true;
    finalizePvpMatch(gameId).catch((e) => console.error("[finalize]", e));
    const moves = Array.isArray(game.move_history) ? game.move_history.length : 0;
    const winner = game.winner;
    const playerWon = myColor && winner === myColor;
    const tips = generateTips({
      moves,
      result: winner === "draw" ? "draw" : playerWon ? "win" : "loss",
      lostMaterial: 0,
    });
    setOverlay({ winner: winner ?? "white", tips });
  }, [game, gameId, myColor]);

  const applyAndSubmit = useCallback(
    async (from, to, promo) => {
      if (!game || !isMyTurn) return;
      const sim = simulateMove(game.board, from, to, game.en_passant, game.castling);
      // Under-promotion: simulateMove auto-queens; override if needed.
      if (promo && promo !== "Q") {
        sim.board[to[0]][to[1]] = myColor === "white" ? promo : promo.toLowerCase();
      }
      const nextTurn = myColor === "white" ? "black" : "white";
      const inCheck = isInCheck(sim.board, nextTurn);
      const hasMove = hasLegalMove(sim.board, nextTurn, sim.enPassant, sim.castling);
      let status = null;
      let winner = null;
      if (!hasMove) {
        status = "finished";
        winner = inCheck ? myColor : "draw";
      }

      const movingPiece = game.board[from[0]][from[1]];
      const moveSAN =
        (movingPiece.toUpperCase() !== "P" ? movingPiece.toUpperCase() : "") +
        FILES[to[1]] +
        (8 - to[0]);

      try {
        await submitMove(
          gameId,
          {
            board: sim.board,
            enPassant: sim.enPassant,
            castling: sim.castling,
            prevHistory: game.move_history ?? [],
          },
          moveSAN,
          { status, winner }
        );
        setSelected(null);
        setValidMoves([]);
        setPendingPromo(null);
      } catch (e) {
        setErr(e.message || String(e));
      }
    },
    [game, isMyTurn, myColor, gameId]
  );

  const handleClick = useCallback(
    (r, c) => {
      if (!game || !isMyTurn || pendingPromo) return;
      const piece = game.board[r][c];
      if (piece && colorOf(piece) === myColor) {
        setSelected([r, c]);
        setValidMoves(legalMoves(game.board, r, c, game.en_passant, game.castling));
        return;
      }
      if (selected) {
        const [sr, sc] = selected;
        if (!validMoves.some(([vr, vc]) => vr === r && vc === c)) {
          setSelected(null);
          setValidMoves([]);
          return;
        }
        const moving = game.board[sr][sc];
        const promoRow = myColor === "white" ? 0 : 7;
        if (moving.toUpperCase() === "P" && r === promoRow) {
          setPendingPromo({ from: [sr, sc], to: [r, c] });
          return;
        }
        applyAndSubmit([sr, sc], [r, c], null);
      }
    },
    [game, isMyTurn, myColor, pendingPromo, selected, validMoves, applyAndSubmit]
  );

  const handleForfeit = async () => {
    if (!game || !myColor) return;
    const winner = myColor === "white" ? "black" : "white";
    try {
      await submitMove(
        gameId,
        {
          board: game.board,
          enPassant: game.en_passant,
          castling: game.castling,
          prevHistory: game.move_history ?? [],
        },
        "forfeit",
        { status: "finished", winner }
      );
    } catch (e) {
      setErr(e.message || String(e));
    }
  };

  if (err && !game) {
    return (
      <div style={{ padding: 24, color: "#fecaca", textAlign: "center" }}>
        <p>Could not load game: {err}</p>
        <button onClick={() => navigate("/lobby")} style={btnStyle}>
          Back to lobby
        </button>
      </div>
    );
  }
  if (!game) return <div style={{ padding: 24 }}>Loading…</div>;

  const opponentName =
    myColor === "white"
      ? game.black?.display_name ?? "Waiting…"
      : game.white?.display_name ?? "Unknown";
  const myName =
    myColor === "white"
      ? game.white?.display_name ?? "You"
      : game.black?.display_name ?? "You";
  const inCheck = isInCheck(game.board, game.turn);

  const statusText =
    game.status === "waiting"
      ? "Waiting for opponent to join…"
      : game.status === "finished"
        ? game.winner === "draw"
          ? "Draw"
          : `${theme.sideNames[game.winner]} wins`
        : isMyTurn
          ? inCheck
            ? "You're in check!"
            : "Your turn"
          : inCheck
            ? `${opponentName} in check`
            : `${opponentName}'s turn`;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg,#1a1510,#2a2015,#1a1510)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "20px 12px",
        color: "#e7e5e4",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 20,
          alignItems: "flex-start",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              width: `calc(${SQ} * 8)`,
            }}
          >
            <div>
              <h1 style={{ fontFamily: "'Libre Baskerville',serif", fontSize: "clamp(16px,3.5vw,22px)", margin: 0 }}>
                vs {opponentName}
              </h1>
              <span style={{ fontSize: 10, color: "#78716c", textTransform: "uppercase", letterSpacing: ".08em" }}>
                {myColor ? `You are ${myColor}` : "Spectating"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => navigate("/lobby")} style={btnStyle}>
                Lobby
              </button>
              {myColor && game.status === "active" && (
                <button onClick={handleForfeit} style={{ ...btnStyle, color: "#fecaca" }}>
                  Forfeit
                </button>
              )}
            </div>
          </div>

          <div
            style={{
              width: `calc(${SQ} * 8)`,
              padding: "4px 8px",
              fontSize: 11,
              color: "#a8a29e",
              textAlign: "center",
            }}
          >
            {flipped ? myName : opponentName} ({flipped ? "↓" : "↑"})
          </div>

          <GameBoard
            board={game.board}
            theme={theme}
            selected={selected}
            validMoves={validMoves}
            lastMove={null}
            turn={game.turn}
            inCheck={inCheck}
            captureAnim={null}
            onSquareClick={handleClick}
            onCaptureAnimDone={() => {}}
            disabled={!isMyTurn || game.status !== "active"}
            flipped={flipped}
          />

          <div
            style={{
              width: `calc(${SQ} * 8)`,
              padding: "4px 8px",
              fontSize: 11,
              color: "#a8a29e",
              textAlign: "center",
            }}
          >
            {flipped ? opponentName : myName} ({flipped ? "↑" : "↓"})
          </div>

          <div
            style={{
              padding: "7px 14px",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 500,
              background: inCheck ? "#7f1d1d" : "#292118",
              border: `1px solid ${inCheck ? "#dc2626" : "#44403c"}`,
              color: inCheck ? "#fecaca" : "#e7e5e4",
              width: `calc(${SQ} * 8)`,
              textAlign: "center",
            }}
          >
            {statusText}
          </div>

          {err && (
            <div
              style={{
                width: `calc(${SQ} * 8)`,
                background: "#7f1d1d",
                border: "1px solid #dc2626",
                color: "#fecaca",
                fontSize: 12,
                padding: 10,
                borderRadius: 6,
              }}
            >
              {err}
            </div>
          )}
        </div>

        <div
          style={{
            ...cardStyle,
            width: 170,
            maxHeight: `calc(${SQ} * 8 + 120px)`,
            display: "flex",
            flexDirection: "column",
            padding: 0,
          }}
        >
          <div style={{ padding: "10px 12px 6px", borderBottom: "1px solid #3a3025" }}>
            <h2
              style={{
                fontFamily: "'Libre Baskerville',serif",
                fontSize: 13,
                fontWeight: 700,
                margin: 0,
                color: "#a8a29e",
                letterSpacing: ".05em",
                textTransform: "uppercase",
              }}
            >
              Moves
            </h2>
          </div>
          <div style={{ padding: "6px 12px", overflowY: "auto", flex: 1, fontSize: 12 }}>
            {(!game.move_history || game.move_history.length === 0) && (
              <span style={{ color: "#57534e", fontStyle: "italic", fontSize: 11 }}>No moves yet</span>
            )}
            {Array.from({ length: Math.ceil((game.move_history?.length ?? 0) / 2) }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 5, padding: "1.5px 0" }}>
                <span style={{ color: "#57534e", minWidth: 22, fontSize: 10 }}>{i + 1}.</span>
                <span style={{ color: "#e7e5e4", minWidth: 44, fontSize: 12 }}>
                  {game.move_history[i * 2]}
                </span>
                {game.move_history[i * 2 + 1] && (
                  <span style={{ color: "#a8a29e", fontSize: 12 }}>
                    {game.move_history[i * 2 + 1]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {pendingPromo && (
        <PromotionDialog
          theme={theme}
          turn={myColor ?? "white"}
          onPick={(choice) => applyAndSubmit(pendingPromo.from, pendingPromo.to, choice)}
        />
      )}
      {overlay && (
        <CheckmateOverlay
          winner={overlay.winner}
          winnerName={
            overlay.winner === "white"
              ? (game.white?.display_name ?? "White")
              : (game.black?.display_name ?? "Black")
          }
          loserName={
            overlay.winner === "white"
              ? (game.black?.display_name ?? "Black")
              : (game.white?.display_name ?? "White")
          }
          theme={theme}
          tips={overlay.tips}
          onReplay={null}
          onMenu={() => navigate("/menu")}
        />
      )}
    </div>
  );
}
