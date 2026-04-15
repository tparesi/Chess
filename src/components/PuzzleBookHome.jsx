import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import puzzleData from "../puzzles/data.json";
import chaptersData from "../puzzles/chapters.json";
import { useAuth } from "../hooks/useAuth.js";
import { firstUnsolvedIndex, usePuzzleProgress } from "../hooks/usePuzzleProgress.js";
import { SummitBadge } from "./SummitBadge.jsx";
import { btnStyle, cardStyle, ghostBtnStyle, primaryBtnStyle } from "./ui.js";

// Precomputed: { chapterId: { count, startIndex } }
function computeChapterSpans(puzzles) {
  const spans = {};
  for (let i = 0; i < puzzles.length; i++) {
    const ch = puzzles[i].chapter;
    if (!spans[ch]) spans[ch] = { startIndex: i, count: 0 };
    spans[ch].count += 1;
  }
  return spans;
}

export function PuzzleBookHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loading, solvedIds } = usePuzzleProgress(user?.id);

  const spans = useMemo(() => computeChapterSpans(puzzleData), []);
  const currentIndex = useMemo(
    () => firstUnsolvedIndex(puzzleData, solvedIds),
    [solvedIds]
  );
  const totalSolved = solvedIds.size;
  const totalPuzzles = puzzleData.length;
  const pctOverall = Math.round((totalSolved / totalPuzzles) * 100);
  const currentChapter = currentIndex < totalPuzzles ? puzzleData[currentIndex].chapter : null;

  const handleContinue = () => {
    if (currentIndex >= totalPuzzles) return;
    const puzzle = puzzleData[currentIndex];
    const chMeta = chaptersData.find((c) => c.id === puzzle.chapter);
    const firstInChapter = spans[puzzle.chapter].startIndex;
    // If this is the first puzzle of a brand new chapter (nothing solved from
    // it yet), show the intro; otherwise go straight to solving.
    const anySolvedInChapter = puzzleData
      .slice(firstInChapter, firstInChapter + spans[puzzle.chapter].count)
      .some((p) => solvedIds.has(p.id));
    if (!anySolvedInChapter && chMeta) {
      navigate(`/puzzles/chapter/${puzzle.chapter}`);
    } else {
      navigate(`/puzzles/solve/${currentIndex}`);
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
          <button onClick={() => navigate("/menu")} style={ghostBtnStyle}>
            ← Back
          </button>
        </div>

        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-xl)",
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: "0 0 4px",
            letterSpacing: "-0.02em",
            fontVariationSettings: '"SOFT" 40, "opsz" 144',
          }}
        >
          Puzzle Book
        </h2>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "var(--text-sm)",
            margin: "0 0 24px",
            fontStyle: "italic",
            fontFamily: "var(--font-display)",
          }}
        >
          Learn chess by solving — one at a time, in order.
        </p>

        {/* Overall progress card */}
        <div style={{ ...cardStyle, padding: "24px 28px", marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontWeight: 600,
              }}
            >
              Overall progress
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "var(--text-lg)",
                color: "var(--primary)",
                fontVariationSettings: '"opsz" 144',
              }}
            >
              {totalSolved} / {totalPuzzles}
            </span>
          </div>
          <div
            style={{
              height: 10,
              background: "var(--bg-sunk)",
              borderRadius: "var(--radius-pill)",
              overflow: "hidden",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pctOverall}%`,
                background: "linear-gradient(90deg, var(--primary), var(--accent))",
                transition: "width var(--dur-slow) var(--ease)",
              }}
            />
          </div>
          {currentIndex < totalPuzzles ? (
            <button
              onClick={handleContinue}
              disabled={loading}
              style={{
                ...primaryBtnStyle,
                width: "100%",
                padding: "14px 20px",
                fontSize: "var(--text-base)",
              }}
            >
              {totalSolved === 0
                ? "Start Chapter 1"
                : `Continue — Puzzle ${currentIndex + 1} of ${totalPuzzles}`}
            </button>
          ) : (
            <div
              style={{
                padding: "14px 20px",
                borderRadius: "var(--radius-sm)",
                background: "var(--success-tint)",
                color: "var(--success)",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              You've finished the whole book!
            </div>
          )}
        </div>

        {/* Chapters list */}
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          Chapters
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {chaptersData.map((ch) => {
            const span = spans[ch.id] ?? { startIndex: 0, count: 0 };
            const chapterPuzzles = puzzleData.slice(
              span.startIndex,
              span.startIndex + span.count
            );
            const solvedInChapter = chapterPuzzles.filter((p) =>
              solvedIds.has(p.id)
            ).length;
            const pct =
              span.count > 0 ? Math.round((solvedInChapter / span.count) * 100) : 0;
            const isLocked = currentIndex < span.startIndex;
            const isCurrent = ch.id === currentChapter;
            const isDone = solvedInChapter === span.count && span.count > 0;

            return (
              <div
                key={ch.id}
                style={{
                  background: isCurrent ? "var(--accent-tint)" : "var(--bg-raised)",
                  border: `1px solid ${
                    isCurrent ? "var(--accent)" : "var(--border)"
                  }`,
                  borderRadius: "var(--radius-md)",
                  padding: "16px 20px",
                  boxShadow: "var(--shadow-sm)",
                  opacity: isLocked ? 0.55 : 1,
                  cursor: isLocked ? "not-allowed" : "pointer",
                  transition: "all var(--dur) var(--ease)",
                  animation: `fadeSlideUp 0.4s var(--ease) ${ch.id * 0.03}s both`,
                }}
                onClick={() => {
                  if (isLocked) return;
                  // Jump into the chapter intro if nothing solved yet, else the solve screen
                  if (solvedInChapter === 0) {
                    navigate(`/puzzles/chapter/${ch.id}`);
                  } else {
                    // Continue at the first unsolved of this chapter (or at the first if all solved)
                    const nextIdx = chapterPuzzles.findIndex(
                      (p) => !solvedIds.has(p.id)
                    );
                    const target =
                      nextIdx >= 0 ? span.startIndex + nextIdx : span.startIndex;
                    navigate(`/puzzles/solve/${target}`);
                  }
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: "var(--text-sm)",
                        color: "var(--text-tertiary)",
                        fontVariationSettings: '"opsz" 144',
                      }}
                    >
                      {String(ch.id).padStart(2, "0")}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 600,
                        fontSize: "var(--text-md)",
                        color: "var(--text-primary)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {ch.title}
                    </span>
                    {isLocked && <span style={{ fontSize: 14 }}>🔒</span>}
                    {isDone && <span style={{ fontSize: 14 }}>✓</span>}
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {solvedInChapter}/{span.count}
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: "var(--bg-sunk)",
                    borderRadius: "var(--radius-pill)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: isDone ? "var(--success)" : "var(--primary)",
                      transition: "width var(--dur-slow) var(--ease)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
