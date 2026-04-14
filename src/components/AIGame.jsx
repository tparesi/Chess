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
import { PIECE_VALUES } from "../chess/ai.js";
import { generateTips } from "../chess/tips.js";
import { useAuth } from "../hooks/useAuth.js";
import { useProfile } from "../hooks/useProfile.js";
import { recordAiMatch } from "../lib/games.js";
import { getTheme, DEFAULT_THEME_ID } from "../themes/index.js";
import { CheckmateOverlay } from "./CheckmateOverlay.jsx";
import { GameBoard, SQ } from "./GameBoard.jsx";
import { PromotionDialog } from "./PromotionDialog.jsx";
import { btnStyle, cardStyle, sortCapturedByValue } from "./ui.js";

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
    const playerWon = winner === "white";
    const lostMaterial = captured.white.reduce(
      (s, p) => s + PIECE_VALUES[p.toUpperCase()] / 100,
      0
    );
    const gd = {
      moves: history.length,
      result: winner == null ? "draw" : playerWon ? "win" : "loss",
      lostMaterial,
    };
    const tips = generateTips(gd);

    if (user && winner != null) {
      recordAiMatch({
        userId: user.id,
        result: winner,
        difficulty,
        moves: history,
      }).catch((e) => console.error("[recordAiMatch]", e));
    }

    const t = setTimeout(
      () => setOverlay({ winner: winner ?? "white", tips }),
      800
    );
    return () => clearTimeout(t);
  }, [gameStatus, turn, captured.white, history, user, difficulty]);

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
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "center" }}>
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
                Chess
              </h1>
              <span style={{ fontSize: 10, color: "#78716c", textTransform: "uppercase", letterSpacing: ".08em" }}>
                vs AI ({difficulty})
              </span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => navigate("/menu")}
                style={btnStyle}
              >
                Menu
              </button>
              <button onClick={reset} style={{ ...btnStyle, color: "#a8a29e" }}>
                Restart
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 2, minHeight: 22, alignItems: "center", width: `calc(${SQ} * 8)`, paddingLeft: 2 }}>
            <span style={{ fontSize: 13, marginRight: 4 }}>{theme.sideClimates.black}</span>
            {sortCapturedByValue(captured.black).map((p, i) => (
              <span key={i} style={{ opacity: 0.85, display: "inline-flex" }}>
                {theme.renderPiece(p, { size: "18px" })}
              </span>
            ))}
          </div>

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

          <div style={{ display: "flex", gap: 2, minHeight: 22, alignItems: "center", width: `calc(${SQ} * 8)`, paddingLeft: 2 }}>
            <span style={{ fontSize: 13, marginRight: 4 }}>{theme.sideClimates.white}</span>
            {sortCapturedByValue(captured.white).map((p, i) => (
              <span key={i} style={{ opacity: 0.85, display: "inline-flex" }}>
                {theme.renderPiece(p, { size: "18px" })}
              </span>
            ))}
          </div>

          <div
            style={{
              padding: "7px 14px",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 500,
              background:
                gameStatus === "checkmate"
                  ? "#14532d"
                  : gameStatus === "check"
                    ? "#7f1d1d"
                    : aiThinking
                      ? "#1e293b"
                      : "#292118",
              border: `1px solid ${
                gameStatus === "checkmate"
                  ? "#22c55e"
                  : gameStatus === "check"
                    ? "#dc2626"
                    : aiThinking
                      ? "#3b82f6"
                      : "#44403c"
              }`,
              color:
                gameStatus === "checkmate"
                  ? "#bbf7d0"
                  : gameStatus === "check"
                    ? "#fecaca"
                    : aiThinking
                      ? "#93c5fd"
                      : "#e7e5e4",
              width: `calc(${SQ} * 8)`,
              textAlign: "center",
            }}
          >
            {statusText}
            {aiThinking && (
              <span style={{ marginLeft: 2 }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      animation: "dotPulse 1.4s infinite",
                      animationDelay: `${i * 0.2}s`,
                      fontSize: 16,
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

        <div style={{ ...cardStyle, width: 170, maxHeight: `calc(${SQ} * 8 + 120px)`, overflow: "hidden", display: "flex", flexDirection: "column", padding: 0 }}>
          <div style={{ padding: "10px 12px 6px", borderBottom: "1px solid #3a3025" }}>
            <h2 style={{ fontFamily: "'Libre Baskerville',serif", fontSize: 13, fontWeight: 700, margin: 0, color: "#a8a29e", letterSpacing: ".05em", textTransform: "uppercase" }}>
              Moves
            </h2>
          </div>
          <div ref={movesScrollRef} style={{ padding: "6px 12px", overflowY: "auto", flex: 1, fontSize: 12 }}>
            {history.length === 0 && (
              <span style={{ color: "#57534e", fontStyle: "italic", fontSize: 11 }}>No moves yet</span>
            )}
            {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 5, padding: "1.5px 0", animation: "fadeIn .2s ease-out" }}>
                <span style={{ color: "#57534e", minWidth: 22, fontSize: 10 }}>{i + 1}.</span>
                <span style={{ color: "#e7e5e4", minWidth: 44, fontSize: 12 }}>{history[i * 2]}</span>
                {history[i * 2 + 1] && (
                  <span style={{ color: "#a8a29e", fontSize: 12 }}>{history[i * 2 + 1]}</span>
                )}
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #3a3025", padding: "8px 12px" }}>
            <span style={{ fontSize: 10, color: "#78716c", textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 4 }}>
              Pieces
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px" }}>
              {["K", "Q", "R", "B", "N", "P"].map((p) => (
                <div key={p} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ display: "inline-flex" }}>
                    {theme.renderPiece(p, { size: "18px" })}
                  </span>
                  <span style={{ fontSize: 10, color: "#a8a29e" }}>{theme.labels[p]}</span>
                </div>
              ))}
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
          tips={overlay.tips}
          onReplay={reset}
          onMenu={() => navigate("/menu")}
        />
      )}
    </div>
  );
}
