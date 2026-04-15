import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import chaptersData from "../puzzles/chapters.json";
import puzzleData from "../puzzles/data.json";
import { SummitBadge } from "./SummitBadge.jsx";
import { btnStyle, cardStyle, ghostBtnStyle, primaryBtnStyle } from "./ui.js";

export function ChapterIntro() {
  const { id } = useParams();
  const navigate = useNavigate();
  const chapterId = Number(id);
  const chapter = chaptersData.find((c) => c.id === chapterId);
  const firstIndex = useMemo(
    () => puzzleData.findIndex((p) => p.chapter === chapterId),
    [chapterId]
  );

  if (!chapter || firstIndex < 0) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>Chapter not found.</p>
        <button onClick={() => navigate("/puzzles")} style={btnStyle}>
          Back to Puzzle Book
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        padding: "32px 20px 64px",
      }}
    >
      <div style={{ maxWidth: 520, width: "100%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 28,
          }}
        >
          <SummitBadge size="header" showWordmark />
          <button onClick={() => navigate("/puzzles")} style={ghostBtnStyle}>
            ← Book
          </button>
        </div>

        <div
          style={{
            ...cardStyle,
            padding: "32px 36px",
            animation: "summitDrop 0.6s var(--ease-overshoot) both",
          }}
        >
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--accent)",
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Chapter {chapter.id}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: "0 0 20px",
              letterSpacing: "-0.02em",
              fontVariationSettings: '"SOFT" 50, "opsz" 144',
              lineHeight: 1.1,
            }}
          >
            {chapter.title}
          </h1>
          <p
            style={{
              fontSize: "var(--text-base)",
              color: "var(--text-secondary)",
              lineHeight: 1.65,
              margin: "0 0 28px",
            }}
          >
            {chapter.intro}
          </p>
          <button
            onClick={() => navigate(`/puzzles/solve/${firstIndex}`)}
            style={{
              ...primaryBtnStyle,
              width: "100%",
              padding: "14px 20px",
              fontSize: "var(--text-base)",
            }}
          >
            Start Chapter {chapter.id} →
          </button>
        </div>
      </div>
    </div>
  );
}
