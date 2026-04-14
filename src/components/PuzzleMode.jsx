import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { colorOf } from "../chess/board.js";
import { legalMoves } from "../chess/moves.js";
import { PUZZLES } from "../chess/puzzles.js";
import { getTheme, DEFAULT_THEME_ID } from "../themes/index.js";
import {
  btnStyle,
  menuDescStyle,
  menuItemStyle,
  menuLabelStyle,
  screenStyle,
} from "./ui.js";
import { GameBoard, SQ } from "./GameBoard.jsx";

const NO_CASTLING = { K: false, Q: false, k: false, q: false };

export function PuzzleMode() {
  const navigate = useNavigate();
  const theme = getTheme(DEFAULT_THEME_ID);
  const [puzzle, setPuzzle] = useState(null);
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [result, setResult] = useState(null);
  const [showHint, setShowHint] = useState(false);

  if (!puzzle) {
    return (
      <div style={screenStyle}>
        <div style={{ maxWidth: 460, width: "100%" }}>
          <button onClick={() => navigate("/menu")} style={{ ...btnStyle, marginBottom: 16 }}>
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
            Training Puzzles
          </h2>
          <p style={{ color: "#78716c", fontSize: 13, textAlign: "center", margin: "0 0 20px" }}>
            Solve tactical positions to sharpen your skills
          </p>
          {PUZZLES.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPuzzle(p);
                setResult(null);
                setSelected(null);
                setValidMoves([]);
                setShowHint(false);
              }}
              style={{ ...menuItemStyle, marginBottom: 8 }}
            >
              <span style={{ fontSize: 20, minWidth: 32 }}>
                {p.category === "Checkmate" ? "♟️" : "⚔️"}
              </span>
              <div>
                <span style={menuLabelStyle}>{p.title}</span>
                <span style={menuDescStyle}>{p.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const handleSquare = (r, c) => {
    if (result) return;
    const piece = puzzle.board[r][c];
    if (piece && colorOf(piece) === "white") {
      setSelected([r, c]);
      setValidMoves(legalMoves(puzzle.board, r, c, null, NO_CASTLING));
      return;
    }
    if (selected) {
      if (!validMoves.some(([vr, vc]) => vr === r && vc === c)) {
        setSelected(null);
        setValidMoves([]);
        return;
      }
      const sol = puzzle.solution;
      if (selected[0] === sol.from[0] && selected[1] === sol.from[1] && r === sol.to[0] && c === sol.to[1]) {
        setResult("correct");
      } else {
        setResult("wrong");
      }
      setSelected(null);
      setValidMoves([]);
    }
  };

  return (
    <div style={screenStyle}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: `calc(${SQ} * 8)`,
            alignItems: "center",
          }}
        >
          <button onClick={() => setPuzzle(null)} style={btnStyle}>
            ← Puzzles
          </button>
          <span
            style={{ fontFamily: "'Libre Baskerville',serif", fontSize: 16, color: "#e7e5e4" }}
          >
            {puzzle.title}
          </span>
        </div>
        <p style={{ color: "#a8a29e", fontSize: 12, margin: 0, width: `calc(${SQ} * 8)` }}>
          {puzzle.desc}. White to move.
        </p>
        <GameBoard
          board={puzzle.board}
          theme={theme}
          selected={selected}
          validMoves={validMoves}
          lastMove={null}
          turn="white"
          inCheck={false}
          captureAnim={null}
          onSquareClick={handleSquare}
          onCaptureAnimDone={() => {}}
          disabled={!!result}
        />
        {result === "correct" && (
          <div
            style={{
              background: "#14532d",
              border: "1px solid #22c55e",
              borderRadius: 6,
              padding: "10px 16px",
              color: "#bbf7d0",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Correct! Well done.
          </div>
        )}
        {result === "wrong" && (
          <div
            style={{
              background: "#7f1d1d",
              border: "1px solid #dc2626",
              borderRadius: 6,
              padding: "10px 16px",
              color: "#fecaca",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Not quite. Try again!
            <br />
            <button
              onClick={() => {
                setResult(null);
                setSelected(null);
                setValidMoves([]);
              }}
              style={{ ...btnStyle, marginTop: 6, fontSize: 11 }}
            >
              Retry
            </button>
          </div>
        )}
        {!result && !showHint && (
          <button onClick={() => setShowHint(true)} style={{ ...btnStyle, fontSize: 11 }}>
            Show Hint
          </button>
        )}
        {showHint && !result && (
          <p style={{ color: "#fbbf24", fontSize: 12, margin: 0, fontStyle: "italic" }}>
            💡 {puzzle.hint}
          </p>
        )}
      </div>
    </div>
  );
}
