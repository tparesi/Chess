import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import puzzleData from "../puzzles/data.json";
import chaptersData from "../puzzles/chapters.json";
import { colorOf, FILES } from "../chess/board.js";
import { legalMoves } from "../chess/moves.js";
import { createPuzzleSolver } from "../chess/puzzleSolver.js";
import { useAuth } from "../hooks/useAuth.js";
import { usePuzzleProgress } from "../hooks/usePuzzleProgress.js";
import { getTheme, DEFAULT_THEME_ID } from "../themes/index.js";
import { GameBoard, SQ } from "./GameBoard.jsx";
import { PromotionDialog } from "./PromotionDialog.jsx";
import { SummitBadge } from "./SummitBadge.jsx";
import {
  btnStyle,
  cardStyle,
  errorBoxStyle,
  ghostBtnStyle,
  primaryBtnStyle,
  successBoxStyle,
} from "./ui.js";

// One solve screen for one puzzle at index :idx. Next/back navigation
// handled by updating the route.
export function PuzzleMode() {
  const { idx } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    solvedIds,
    solvedWithHelpIds,
    markSolved,
    markSolvedWithHelp,
  } = usePuzzleProgress(user?.id);
  const theme = getTheme(DEFAULT_THEME_ID);

  const puzzleIndex = Math.max(0, Math.min(puzzleData.length - 1, Number(idx) || 0));
  const puzzle = puzzleData[puzzleIndex];
  const chapter = chaptersData.find((c) => c.id === puzzle.chapter);

  // One solver instance per puzzle. Recreate when the puzzle changes.
  const solverRef = useRef(null);
  const [, forceRender] = useState(0);
  const reRender = useCallback(() => forceRender((n) => n + 1), []);

  // Per-attempt state
  const [attempts, setAttempts] = useState(0);
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [pendingPromo, setPendingPromo] = useState(null);
  const [feedback, setFeedback] = useState(null); // null | {tone:'wrong'|'hint'|'shown'|'correct'|'done', text}
  const [done, setDone] = useState(false);
  const [hintSquare, setHintSquare] = useState(null);

  // Rebuild the solver when the puzzle index changes
  useEffect(() => {
    solverRef.current = createPuzzleSolver(puzzle);
    setAttempts(0);
    setSelected(null);
    setValidMoves([]);
    setPendingPromo(null);
    setFeedback(null);
    setDone(false);
    setHintSquare(null);
    reRender();
  }, [puzzleIndex, puzzle, reRender]);

  const solver = solverRef.current;
  const board = solver?.currentBoard();
  const playerColor = solver?.playerToMove();
  const flipped = playerColor === "black";

  const handleClick = useCallback(
    (r, c) => {
      if (!solver || done || pendingPromo) return;
      const piece = board[r][c];
      if (piece && colorOf(piece) === playerColor) {
        setSelected([r, c]);
        setValidMoves(
          legalMoves(board, r, c, solver.currentState().enPassant, solver.currentState().castling)
        );
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
        const promoRow = playerColor === "white" ? 0 : 7;
        if (moving.toUpperCase() === "P" && r === promoRow) {
          setPendingPromo({ from: [sr, sc], to: [r, c] });
          return;
        }
        tryMove([sr, sc], [r, c], null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board, playerColor, selected, validMoves, done, pendingPromo]
  );

  const tryMove = useCallback(
    (from, to, promo) => {
      if (!solver) return;
      const result = solver.submitMove(from, to, promo);
      setSelected(null);
      setValidMoves([]);
      setPendingPromo(null);

      if (!result.correct) {
        // Wrong move — increment attempt counter, show feedback
        const next = attempts + 1;
        setAttempts(next);
        if (next === 1) {
          setFeedback({ tone: "wrong", text: "Not quite — try again." });
        } else if (next === 2) {
          // Hint: highlight the correct source square
          const fromSquare = solver.getHintFrom();
          setHintSquare(fromSquare);
          setFeedback({
            tone: "hint",
            text: `Hint: try moving the piece on ${FILES[fromSquare[1]]}${8 - fromSquare[0]}.`,
          });
        } else {
          // 3+ wrong: reveal the remaining solution, mark solved_with_help, advance
          const remaining = solver.getRemainingPlayerMoves();
          setFeedback({
            tone: "shown",
            text:
              "Here's the answer: " +
              remaining
                .map((uci) => `${uci.slice(0, 2)}→${uci.slice(2, 4)}`)
                .join(", "),
          });
          setDone(true);
          if (user) markSolvedWithHelp(puzzle.id, next);
        }
        reRender();
        return;
      }

      // Correct!
      if (result.done) {
        setFeedback({ tone: "correct", text: "Correct! Puzzle solved 🎉" });
        setDone(true);
        if (user) markSolved(puzzle.id, attempts + 1);
      } else {
        // Still more moves in the sequence — opponent has already replied
        setFeedback({
          tone: "correct",
          text: "Right move — opponent replied. Your move.",
        });
        // Clear after a beat so the user can focus on the next move
        setTimeout(() => setFeedback(null), 1500);
      }
      reRender();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attempts, solver, puzzle.id, user]
  );

  const handlePromo = useCallback(
    (choice) => {
      if (!pendingPromo) return;
      tryMove(pendingPromo.from, pendingPromo.to, choice);
    },
    [pendingPromo, tryMove]
  );

  const next = () => {
    if (puzzleIndex + 1 < puzzleData.length) {
      const nextPuzzle = puzzleData[puzzleIndex + 1];
      // If entering a new chapter, show intro
      if (nextPuzzle.chapter !== puzzle.chapter) {
        navigate(`/puzzles/chapter/${nextPuzzle.chapter}`);
      } else {
        navigate(`/puzzles/solve/${puzzleIndex + 1}`);
      }
    } else {
      navigate("/puzzles");
    }
  };

  // Is this puzzle the last in its chapter? Used to show the chapter completion
  // celebration in feedback.
  const isLastInChapter = useMemo(() => {
    const nextP = puzzleData[puzzleIndex + 1];
    return !nextP || nextP.chapter !== puzzle.chapter;
  }, [puzzleIndex, puzzle.chapter]);

  if (!solver) return null;

  const feedbackStyle =
    feedback?.tone === "correct"
      ? successBoxStyle
      : feedback?.tone === "wrong"
        ? errorBoxStyle
        : feedback?.tone === "hint"
          ? {
              background: "var(--accent-tint)",
              border: "1px solid var(--accent)",
              color: "var(--accent-hover)",
              fontSize: "var(--text-sm)",
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
            }
          : feedback?.tone === "shown"
            ? {
                background: "var(--primary-tint)",
                border: "1px solid var(--primary)",
                color: "var(--primary)",
                fontSize: "var(--text-sm)",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
              }
            : null;

  const isAlreadySolved = solvedIds.has(puzzle.id);
  const solvedWithHelpBefore = solvedWithHelpIds.has(puzzle.id);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        padding: "32px 20px 64px",
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
        {/* Header */}
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
            subtitle={`Puzzle ${puzzleIndex + 1} of ${puzzleData.length}`}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => navigate("/puzzles")} style={ghostBtnStyle}>
              ← Book
            </button>
          </div>
        </div>

        {/* Main layout */}
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
            <div
              style={{
                width: `calc(${SQ} * 8)`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                fontSize: "var(--text-sm)",
              }}
            >
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                Chapter {puzzle.chapter}: {chapter?.title}
              </span>
              <span style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                {playerColor === "white" ? "White" : "Black"} to move
              </span>
            </div>

            <GameBoard
              board={board}
              theme={theme}
              selected={selected}
              validMoves={validMoves}
              lastMove={null}
              turn={playerColor}
              inCheck={false}
              captureAnim={null}
              onSquareClick={handleClick}
              onCaptureAnimDone={() => {}}
              disabled={done}
              flipped={flipped}
            />

            {/* Feedback pill */}
            {feedback && (
              <div
                style={{
                  ...feedbackStyle,
                  width: `calc(${SQ} * 8)`,
                  textAlign: "center",
                  fontWeight: 500,
                }}
              >
                {feedback.text}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, width: `calc(${SQ} * 8)` }}>
              {done ? (
                <button
                  onClick={next}
                  style={{ ...primaryBtnStyle, flex: 1, padding: "14px 20px" }}
                >
                  {puzzleIndex + 1 < puzzleData.length
                    ? isLastInChapter
                      ? "Chapter complete — next chapter →"
                      : "Next puzzle →"
                    : "Back to Puzzle Book"}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      // Skip = reveal solution + mark solved_with_help
                      const remaining = solver.getRemainingPlayerMoves();
                      setFeedback({
                        tone: "shown",
                        text:
                          "Solution: " +
                          remaining
                            .map((uci) => `${uci.slice(0, 2)}→${uci.slice(2, 4)}`)
                            .join(", "),
                      });
                      setDone(true);
                      if (user) markSolvedWithHelp(puzzle.id, Math.max(attempts, 3));
                    }}
                    style={{ ...btnStyle, flex: 1 }}
                  >
                    Show solution
                  </button>
                </>
              )}
            </div>

            {isAlreadySolved && !done && (
              <div
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {solvedWithHelpBefore
                  ? "You solved this with help before — try it clean!"
                  : "You've already solved this one. Warming up?"}
              </div>
            )}

            {hintSquare && !done && (
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
                (The highlighted square is the piece to move.)
              </div>
            )}
          </div>

          {/* Side panel: puzzle info */}
          <div
            style={{
              ...cardStyle,
              width: 200,
              padding: "20px 24px",
            }}
          >
            <div
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Puzzle info
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              <div style={{ marginBottom: 6 }}>
                <strong style={{ color: "var(--text-primary)" }}>Rating:</strong>{" "}
                <span style={{ fontFamily: "var(--font-mono)" }}>{puzzle.rating}</span>
              </div>
              <div>
                <strong style={{ color: "var(--text-primary)" }}>Themes:</strong>
                <div style={{ marginTop: 4 }}>
                  {puzzle.themes.map((t) => (
                    <span
                      key={t}
                      style={{
                        display: "inline-block",
                        fontSize: "var(--text-xs)",
                        background: "var(--bg-sunk)",
                        color: "var(--text-secondary)",
                        padding: "2px 8px",
                        borderRadius: "var(--radius-pill)",
                        marginRight: 4,
                        marginBottom: 4,
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {pendingPromo && (
        <PromotionDialog theme={theme} turn={playerColor} onPick={handlePromo} />
      )}
    </div>
  );
}
