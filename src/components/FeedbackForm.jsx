import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { submitFeedback } from "../lib/games.js";
import { SummitBadge } from "./SummitBadge.jsx";
import {
  cardStyle,
  errorBoxStyle,
  ghostBtnStyle,
  inputStyle,
  labelStyle,
  primaryBtnStyle,
  successBoxStyle,
} from "./ui.js";

const CATEGORIES = [
  { id: "feature", label: "Feature", emoji: "✨" },
  { id: "bug", label: "Bug", emoji: "🐞" },
  { id: "other", label: "Other", emoji: "💭" },
];

export function FeedbackForm() {
  const navigate = useNavigate();
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("feature");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await submitFeedback({ body: body.trim(), category });
      setDone(true);
      setBody("");
    } catch (e2) {
      setErr(e2.message || String(e2));
    } finally {
      setBusy(false);
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
          <button onClick={() => navigate("/menu")} style={ghostBtnStyle}>
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
          Tell me what to build next
        </h2>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "var(--text-sm)",
            margin: "0 0 20px",
          }}
        >
          What would make the game more fun? What's broken? Every note goes straight
          to me.
        </p>

        {done && (
          <div style={{ ...successBoxStyle, marginBottom: 16 }}>
            Thanks! I got your note. More?
          </div>
        )}

        {err && <div style={{ ...errorBoxStyle, marginBottom: 16 }}>{err}</div>}

        <form onSubmit={submit} style={cardStyle}>
          <label style={labelStyle}>Type</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {CATEGORIES.map((c) => {
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "var(--radius-pill)",
                    border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`,
                    background: active ? "var(--primary-tint)" : "var(--bg-raised)",
                    color: active ? "var(--primary)" : "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: "var(--text-sm)",
                    fontWeight: 600,
                    fontFamily: "var(--font-body)",
                    transition: "all var(--dur) var(--ease)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>{c.emoji}</span>
                  {c.label}
                </button>
              );
            })}
          </div>

          <label style={labelStyle}>Your idea</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={5}
            placeholder="Can we have a Minecraft theme? Or a timer? Or a way to chat with friends?"
            style={{
              ...inputStyle,
              resize: "vertical",
              minHeight: 120,
              fontFamily: "var(--font-body)",
            }}
          />

          <button
            type="submit"
            disabled={busy || !body.trim()}
            style={{
              ...primaryBtnStyle,
              width: "100%",
              padding: "14px 20px",
              marginTop: 16,
              fontSize: "var(--text-base)",
              opacity: busy || !body.trim() ? 0.6 : 1,
            }}
          >
            {busy ? "Sending…" : "Send feedback"}
          </button>
        </form>
      </div>
    </div>
  );
}
