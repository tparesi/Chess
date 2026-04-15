import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { colorOf, computeCapturedFromBoard } from "../chess/board.js";
import {
  hasLegalMove,
  isInCheck,
  legalMoves,
  simulateMove,
} from "../chess/moves.js";
import { moveToSAN } from "../chess/san.js";
import { analyzeLastMove, inferMoveFromDiff } from "../chess/coach.js";
import { useAuth } from "../hooks/useAuth.js";
import { usePreferences } from "../hooks/usePreferences.js";
import { finalizePvpMatch, getGame, submitMove } from "../lib/games.js";
import { supabase } from "../lib/supabase.js";
import { getTheme, DEFAULT_THEME_ID } from "../themes/index.js";
import { CheckmateOverlay } from "./CheckmateOverlay.jsx";
import { CoachPanel } from "./CoachPanel.jsx";
import { GameBoard, SQ } from "./GameBoard.jsx";
import { PromotionDialog } from "./PromotionDialog.jsx";
import { CapturedStrip } from "./CapturedStrip.jsx";
import { SummitBadge } from "./SummitBadge.jsx";
import { btnStyle, cardStyle, errorBoxStyle, ghostBtnStyle, primaryBtnStyle, sortCapturedByValue } from "./ui.js";

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
  const [captureAnim, setCaptureAnim] = useState(null);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const [latestTip, setLatestTip] = useState(null);
  const recentTipIdsRef = useRef([]);
  const prevBoardRef = useRef(null);
  const prev2BoardRef = useRef(null);
  const finalizedRef = useRef(false);
  const { prefs } = usePreferences();
  const coachEnabled = prefs.coachEnabled;

  const captured = useMemo(
    () => (game?.board ? computeCapturedFromBoard(game.board) : { white: [], black: [] }),
    [game?.board]
  );

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

  // Detect captures by diffing the incoming board against the previous one.
  // A capture shows up as a square whose piece color flipped (enemy piece
  // replaced by one of our color) or as an en-passant: enemy pawn vanished
  // from an adjacent square without being the move origin.
  useEffect(() => {
    if (!game) return;
    const nextBoard = game.board;
    const prev = prevBoardRef.current;
    prevBoardRef.current = nextBoard;
    if (!prev) return;

    // Find standard capture: same square, color flipped
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const before = prev[r][c];
        const after = nextBoard[r][c];
        if (!before || !after) continue;
        const beforeWhite = before === before.toUpperCase();
        const afterWhite = after === after.toUpperCase();
        if (beforeWhite !== afterWhite) {
          setCaptureAnim({ pieceKey: before, row: r, col: c });
          return;
        }
      }
    }
    // En-passant: a pawn vanished from a square that isn't the move origin.
    // We don't know the origin easily here, so approximate: any square where
    // a pawn existed before and is now empty — if more than one, ignore.
    const vanished = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const before = prev[r][c];
        const after = nextBoard[r][c];
        if (before && !after && before.toUpperCase() === "P") {
          vanished.push({ pieceKey: before, row: r, col: c });
        }
      }
    }
    if (vanished.length === 2) {
      // Exactly one mover + one captured. The captured is the one still on
      // an interior rank (4th/5th from either side).
      const ep = vanished.find((v) => v.row === 3 || v.row === 4);
      if (ep) setCaptureAnim(ep);
    }
  }, [game?.board]);

  // Observational coach — only for the player's own moves. After the
  // player moves, the server flips `game.turn` to the opponent; we detect
  // "my move just happened" by checking that the new turn is NOT mine. We
  // diff the board to infer the primary move (from/to/captured) and run
  // the analyzer. Skips opponent moves so tips stay relevant to the kid.
  useEffect(() => {
    if (!coachEnabled || !game || !myColor) return;
    const prevBoard = prev2BoardRef.current;
    prev2BoardRef.current = game.board;
    if (!prevBoard) return;
    // Skip if it wasn't our move that caused this update
    if (game.turn === myColor) return;

    const move = inferMoveFromDiff(prevBoard, game.board, myColor);
    if (!move.from || !move.to) return;

    const tip = analyzeLastMove(
      { board: prevBoard },
      { board: game.board },
      {
        from: move.from,
        to: move.to,
        piece: move.piece,
        capturedPiece: move.capturedPiece,
        moveNumber: Math.floor((game.move_history?.length ?? 0) / 2) + 1,
        playerColor: myColor,
        theme,
        recentTipIds: recentTipIdsRef.current,
      }
    );
    if (tip) {
      setLatestTip(tip);
      recentTipIdsRef.current = [tip.id, ...recentTipIdsRef.current.slice(0, 2)];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.board, coachEnabled, myColor]);

  // Detect game end and finalize
  useEffect(() => {
    if (!game || game.status !== "finished" || finalizedRef.current) return;
    finalizedRef.current = true;
    finalizePvpMatch(gameId).catch((e) => console.error("[finalize]", e));
    setOverlay({ winner: game.winner ?? "white" });
  }, [game, gameId]);

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

      // Proper SAN — uses the PRE-move board so captures/disambiguation/
      // check/mate suffixes work.
      const moveSAN = moveToSAN(
        game.board,
        from,
        to,
        { enPassant: game.en_passant, castling: game.castling },
        promo
      );

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
    setConfirmForfeit(false);
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

  const statusTone = inCheck
    ? { bg: "var(--error-tint)", border: "var(--error)", color: "var(--error)" }
    : game.status === "waiting"
      ? { bg: "var(--accent-tint)", border: "var(--accent)", color: "var(--accent-hover)" }
      : { bg: "var(--bg-raised)", border: "var(--border)", color: "var(--text-primary)" };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "32px 20px 64px",
        color: "var(--text-primary)",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Top header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <SummitBadge
            size="header"
            showWordmark
            subtitle={myColor ? `vs ${opponentName}` : "Spectating"}
          />
          <div style={{ display: "flex", gap: 8 }}>
            {myColor && game.status === "active" && (
              <button
                onClick={() => setConfirmForfeit(true)}
                style={{ ...ghostBtnStyle, color: "var(--error)" }}
              >
                Forfeit
              </button>
            )}
            <button onClick={() => navigate("/lobby")} style={btnStyle}>
              Lobby
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 24,
            alignItems: "flex-start",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <CapturedStrip
              name={opponentName}
              pieces={sortCapturedByValue(flipped ? captured.white : captured.black)}
              theme={theme}
              sqWidth={`calc(${SQ} * 8)`}
            />

            <GameBoard
              board={game.board}
              theme={theme}
              selected={selected}
              validMoves={validMoves}
              lastMove={null}
              turn={game.turn}
              inCheck={inCheck}
              captureAnim={captureAnim}
              onSquareClick={handleClick}
              onCaptureAnimDone={() => setCaptureAnim(null)}
              disabled={!isMyTurn || game.status !== "active"}
              flipped={flipped}
            />

            <CapturedStrip
              name={myName}
              pieces={sortCapturedByValue(flipped ? captured.black : captured.white)}
              theme={theme}
              sqWidth={`calc(${SQ} * 8)`}
              self
            />

            <div
              style={{
                padding: "12px 18px",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                background: statusTone.bg,
                border: `1px solid ${statusTone.border}`,
                color: statusTone.color,
                width: `calc(${SQ} * 8)`,
                textAlign: "center",
                fontFamily: "var(--font-body)",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              {statusText}
            </div>

            {err && (
              <div style={{ ...errorBoxStyle, width: `calc(${SQ} * 8)` }}>{err}</div>
            )}
          </div>

          <div
            style={{
              ...cardStyle,
              width: 200,
              maxHeight: `calc(${SQ} * 8 + 120px)`,
              padding: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "14px 18px 10px",
                borderBottom: "1px solid var(--border)",
                background: "var(--bg-sunk)",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-sm)",
                  fontWeight: 700,
                  margin: 0,
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Moves
              </h2>
            </div>
            <div
              style={{
                padding: "8px 16px",
                overflowY: "auto",
                flex: 1,
                fontSize: "var(--text-sm)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {(!game.move_history || game.move_history.length === 0) && (
                <span
                  style={{
                    color: "var(--text-tertiary)",
                    fontStyle: "italic",
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-xs)",
                  }}
                >
                  No moves yet
                </span>
              )}
              {Array.from({ length: Math.ceil((game.move_history?.length ?? 0) / 2) }).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 6, padding: "3px 0" }}>
                  <span style={{ color: "var(--text-tertiary)", minWidth: 22 }}>{i + 1}.</span>
                  <span style={{ color: "var(--text-primary)", minWidth: 48, fontWeight: 500 }}>
                    {game.move_history[i * 2]}
                  </span>
                  {game.move_history[i * 2 + 1] && (
                    <span style={{ color: "var(--text-secondary)" }}>
                      {game.move_history[i * 2 + 1]}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {coachEnabled && <CoachPanel tip={latestTip} />}
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
          onReplay={null}
          onMenu={() => navigate("/menu")}
        />
      )}

      {confirmForfeit && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--bg-overlay)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 150,
            animation: "fadeIn 0.25s var(--ease)",
          }}
          onClick={() => setConfirmForfeit(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "28px 32px 24px",
              maxWidth: 380,
              width: "88%",
              textAlign: "center",
              boxShadow: "var(--shadow-lg)",
              animation: "summitDrop 0.5s var(--ease-overshoot) both",
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 10 }}>🏳️</div>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-md)",
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: "0 0 8px",
                letterSpacing: "-0.01em",
                fontVariationSettings: '"SOFT" 30, "opsz" 144',
              }}
            >
              Forfeit this game?
            </h3>
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-secondary)",
                margin: "0 0 20px",
                lineHeight: 1.55,
              }}
            >
              This counts as a{" "}
              <strong style={{ color: "var(--error)" }}>loss</strong> and will{" "}
              <strong style={{ color: "var(--error)" }}>lower your ELO</strong>. Your
              opponent will be declared the winner.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => setConfirmForfeit(false)}
                style={{ ...btnStyle, padding: "10px 22px" }}
              >
                Keep playing
              </button>
              <button
                onClick={handleForfeit}
                style={{
                  ...primaryBtnStyle,
                  background: "var(--error)",
                  border: "1px solid var(--error)",
                  padding: "10px 22px",
                }}
              >
                Yes, forfeit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
