import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  cloneBoard,
  colorOf,
  FILES,
  INIT,
  INITIAL_CASTLING,
} from "../chess/board.js";
import {
  hasLegalMove,
  isInCheck,
  legalMoves,
} from "../chess/moves.js";
import { aiMove } from "../chess/ai.js";
import { useAuth } from "../hooks/useAuth.js";
import { useProfile } from "../hooks/useProfile.js";
import { recordAiMatch } from "../lib/games.js";
import { getTheme, DEFAULT_THEME_ID } from "../themes/index.js";
import { CheckmateOverlay } from "./CheckmateOverlay.jsx";
import { GameBoard, SQ } from "./GameBoard.jsx";
import { PromotionDialog } from "./PromotionDialog.jsx";
import { CapturedStrip } from "./CapturedStrip.jsx";
import { SummitBadge } from "./SummitBadge.jsx";
import { btnStyle, cardStyle, ghostBtnStyle, sortCapturedByValue } from "./ui.js";

const initialCastling = () => ({ ...INITIAL_CASTLING });

export function AIGame() {
  const { difficulty = "medium" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const theme = getTheme(DEFAULT_THEME_ID);
  const playerName = profile?.display_name ?? "You";
  const aiName = `AI (${difficulty})`;

  const [board, setBoard] = useState(() => cloneBoard(INIT));
  const [turn, setTurn] = useState("white");
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [history, setHistory] = useState([]);
  const [captured, setCaptured] = useState({ white: [], black: [] });
  const [enPassant, setEnPassant] = useState(null);
  const [castling, setCastling] = useState(initialCastling);
  const [gameStatus, setGameStatus] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [pendingPromo, setPendingPromo] = useState(null);
  const [captureAnim, setCaptureAnim] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [overlay, setOverlay] = useState(null);
  const movesScrollRef = useRef(null);

  useEffect(() => {
    if (movesScrollRef.current) {
      movesScrollRef.current.scrollTop = movesScrollRef.current.scrollHeight;
    }
  }, [history]);

  const reset = useCallback(() => {
    setBoard(cloneBoard(INIT));
    setTurn("white");
    setSelected(null);
    setValidMoves([]);
    setHistory([]);
    setCaptured({ white: [], black: [] });
    setEnPassant(null);
    setCastling(initialCastling());
    setGameStatus(null);
    setLastMove(null);
    setPendingPromo(null);
    setCaptureAnim(null);
    setAiThinking(false);
    setOverlay(null);
  }, []);

  const execMove = useCallback(
    (sr, sc, tr, tc, promo) => {
      const nb = cloneBoard(board);
      const movingPiece = nb[sr][sc];
      const color = colorOf(movingPiece);
      const type = movingPiece.toUpperCase();
      const capturedPiece = nb[tr][tc];
      const isEP =
        type === "P" && enPassant && tr === enPassant[0] && tc === enPassant[1];

      const nextCaptured = {
        white: [...captured.white],
        black: [...captured.black],
      };

      let animInit = null;
      if (capturedPiece) {
        animInit = { pieceKey: capturedPiece, row: tr, col: tc };
        nextCaptured[color].push(capturedPiece);
      }
      if (isEP) {
        const capRow = color === "white" ? tr + 1 : tr - 1;
        const epPiece = nb[capRow][tc];
        animInit = { pieceKey: epPiece, row: capRow, col: tc };
        nextCaptured[color].push(epPiece);
        nb[capRow][tc] = null;
      }

      nb[tr][tc] = promo
        ? color === "white"
          ? promo.toUpperCase()
          : promo.toLowerCase()
        : movingPiece;
      nb[sr][sc] = null;

      if (type === "K" && Math.abs(tc - sc) === 2) {
        const backRank = color === "white" ? 7 : 0;
        if (tc === 6) {
          nb[backRank][5] = nb[backRank][7];
          nb[backRank][7] = null;
        }
        if (tc === 2) {
          nb[backRank][3] = nb[backRank][0];
          nb[backRank][0] = null;
        }
      }

      let nextEP = null;
      if (type === "P" && Math.abs(tr - sr) === 2) {
        nextEP = [(sr + tr) / 2, sc];
      }

      const nextCastling = { ...castling };
      if (type === "K") {
        if (color === "white") {
          nextCastling.K = false;
          nextCastling.Q = false;
        } else {
          nextCastling.k = false;
          nextCastling.q = false;
        }
      }
      if (type === "R") {
        if (sr === 7 && sc === 0) nextCastling.Q = false;
        if (sr === 7 && sc === 7) nextCastling.K = false;
        if (sr === 0 && sc === 0) nextCastling.q = false;
        if (sr === 0 && sc === 7) nextCastling.k = false;
      }
      if (tr === 0 && tc === 0) nextCastling.q = false;
      if (tr === 0 && tc === 7) nextCastling.k = false;
      if (tr === 7 && tc === 0) nextCastling.Q = false;
      if (tr === 7 && tc === 7) nextCastling.K = false;

      const nextTurn = color === "white" ? "black" : "white";
      const inCheck = isInCheck(nb, nextTurn);
      const hasMove = hasLegalMove(nb, nextTurn, nextEP, nextCastling);
      const status = !hasMove ? (inCheck ? "checkmate" : "stalemate") : inCheck ? "check" : null;

      const moveSAN = (type !== "P" ? type : "") + FILES[tc] + (8 - tr);

      setBoard(nb);
      setCaptured(nextCaptured);
      setTurn(nextTurn);
      setSelected(null);
      setValidMoves([]);
      setEnPassant(nextEP);
      setCastling(nextCastling);
      setLastMove({ from: [sr, sc], to: [tr, tc] });
      setHistory((prev) => [...prev, moveSAN]);
      setGameStatus(status);
      setPendingPromo(null);
      if (animInit) setCaptureAnim(animInit);
    },
    [board, captured, enPassant, castling]
  );

  const handleClick = useCallback(
    (r, c) => {
      if (gameStatus === "checkmate" || gameStatus === "stalemate") return;
      if (pendingPromo || captureAnim || aiThinking) return;
      if (turn === "black") return;
      const piece = board[r][c];
      if (piece && colorOf(piece) === turn) {
        setSelected([r, c]);
        setValidMoves(legalMoves(board, r, c, enPassant, castling));
        return;
      }
      if (selected) {
        const [sr, sc] = selected;
        if (!validMoves.some(([vr, vc]) => vr === r && vc === c)) {
          setSelected(null);
          setValidMoves([]);
          return;
        }
        const moving = board[sr][sc];
        const promoRow = turn === "white" ? 0 : 7;
        if (moving.toUpperCase() === "P" && r === promoRow) {
          setPendingPromo({ from: [sr, sc], to: [r, c] });
          return;
        }
        execMove(sr, sc, r, c, null);
      }
    },
    [board, turn, selected, validMoves, enPassant, castling, gameStatus, pendingPromo, captureAnim, aiThinking, execMove]
  );

  const handlePromo = useCallback(
    (choice) => {
      if (!pendingPromo) return;
      execMove(pendingPromo.from[0], pendingPromo.from[1], pendingPromo.to[0], pendingPromo.to[1], choice);
    },
    [pendingPromo, execMove]
  );

  // AI turn
  useEffect(() => {
    if (turn !== "black") return;
    if (captureAnim || gameStatus === "checkmate" || gameStatus === "stalemate") return;
    setAiThinking(true);
    const timer = setTimeout(() => {
      const move = aiMove(board, difficulty, enPassant, castling);
      if (move) {
        const piece = board[move.from[0]][move.from[1]];
        const promo =
          piece?.toUpperCase() === "P" && move.to[0] === 7 ? "Q" : null;
        execMove(move.from[0], move.from[1], move.to[0], move.to[1], promo);
      }
      setAiThinking(false);
    }, difficulty === "hard" ? 200 : 500);
    return () => {
      clearTimeout(timer);
      setAiThinking(false);
    };
  }, [turn, captureAnim, gameStatus, difficulty, board, enPassant, castling, execMove]);

  // Game end → record + show overlay
  useEffect(() => {
    if (gameStatus !== "checkmate" && gameStatus !== "stalemate") return;
    const winner =
      gameStatus === "checkmate" ? (turn === "white" ? "black" : "white") : null;

    if (user && winner != null) {
      recordAiMatch({
        userId: user.id,
        result: winner,
        difficulty,
        moves: history,
      }).catch((e) => console.error("[recordAiMatch]", e));
    }

    const t = setTimeout(() => setOverlay({ winner: winner ?? "white" }), 800);
    return () => clearTimeout(t);
  }, [gameStatus, turn, history, user, difficulty]);

  const statusText = useMemo(() => {
    if (gameStatus === "checkmate") {
      return `Checkmate! ${turn === "white" ? theme.sideNames.black : theme.sideNames.white} wins!`;
    }
    if (gameStatus === "stalemate") return "Stalemate. Draw.";
    if (aiThinking) return `${theme.sideNames.black} thinking`;
    if (gameStatus === "check") {
      return `${turn === "white" ? theme.sideNames.white : theme.sideNames.black} in check!`;
    }
    return `${turn === "white" ? theme.sideNames.white : theme.sideNames.black} to move`;
  }, [gameStatus, turn, aiThinking, theme]);

  const statusTone =
    gameStatus === "checkmate"
      ? { bg: "var(--success-tint)", border: "var(--success)", color: "var(--success)" }
      : gameStatus === "check"
        ? { bg: "var(--error-tint)", border: "var(--error)", color: "var(--error)" }
        : aiThinking
          ? { bg: "var(--primary-tint)", border: "var(--primary)", color: "var(--primary)" }
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
          <SummitBadge size="header" showWordmark subtitle={`vs AI · ${difficulty}`} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={reset} style={ghostBtnStyle}>
              Restart
            </button>
            <button onClick={() => navigate("/menu")} style={btnStyle}>
              Menu
            </button>
          </div>
        </div>

        {/* Main layout: board + sidebar */}
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
            {/* Top captured strip (opponent's pile) */}
            <CapturedStrip
              name={aiName}
              pieces={sortCapturedByValue(captured.black)}
              theme={theme}
              sqWidth={`calc(${SQ} * 8)`}
            />

            <GameBoard
              board={board}
              theme={theme}
              selected={selected}
              validMoves={validMoves}
              lastMove={lastMove}
              turn={turn}
              inCheck={gameStatus === "check"}
              captureAnim={captureAnim}
              onSquareClick={handleClick}
              onCaptureAnimDone={() => setCaptureAnim(null)}
              disabled={turn === "black" || aiThinking}
            />

            {/* Bottom captured strip (your pile) */}
            <CapturedStrip
              name={playerName}
              pieces={sortCapturedByValue(captured.white)}
              theme={theme}
              sqWidth={`calc(${SQ} * 8)`}
              self
            />

            {/* Status bar */}
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
              {aiThinking && (
                <span style={{ marginLeft: 4 }}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        animation: "dotPulse 1.4s infinite",
                        animationDelay: `${i * 0.2}s`,
                        fontSize: 18,
                        fontWeight: 700,
                      }}
                    >
                      .
                    </span>
                  ))}
                </span>
              )}
            </div>
          </div>

          {/* Sidebar: moves + piece legend */}
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
              ref={movesScrollRef}
              style={{
                padding: "8px 16px",
                overflowY: "auto",
                flex: 1,
                fontSize: "var(--text-sm)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {history.length === 0 && (
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
              {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 6,
                    padding: "3px 0",
                    animation: "fadeIn 0.2s var(--ease) both",
                  }}
                >
                  <span style={{ color: "var(--text-tertiary)", minWidth: 22 }}>{i + 1}.</span>
                  <span style={{ color: "var(--text-primary)", minWidth: 48, fontWeight: 500 }}>
                    {history[i * 2]}
                  </span>
                  {history[i * 2 + 1] && (
                    <span style={{ color: "var(--text-secondary)" }}>{history[i * 2 + 1]}</span>
                  )}
                </div>
              ))}
            </div>
            <div
              style={{
                borderTop: "1px solid var(--border)",
                padding: "12px 16px",
                background: "var(--bg-sunk)",
              }}
            >
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  fontWeight: 600,
                  display: "block",
                  marginBottom: 8,
                }}
              >
                Pieces
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px" }}>
                {["K", "Q", "R", "B", "N", "P"].map((p) => (
                  <div key={p} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ display: "inline-flex" }}>
                      {theme.renderPiece(p, { size: "20px" })}
                    </span>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                      {theme.labels[p]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {pendingPromo && (
        <PromotionDialog theme={theme} turn={turn} onPick={handlePromo} />
      )}
      {overlay && (
        <CheckmateOverlay
          winner={overlay.winner}
          winnerName={overlay.winner === "white" ? playerName : aiName}
          loserName={overlay.winner === "white" ? aiName : playerName}
          theme={theme}
          onReplay={reset}
          onMenu={() => navigate("/menu")}
        />
      )}
    </div>
  );
}
