import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { submitFeedback } from "../lib/games.js";
import {
  btnStyle,
  cardStyle,
  inputStyle,
  primaryBtnStyle,
  screenStyle,
} from "./ui.js";

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
    <div style={screenStyle}>
      <div style={{ maxWidth: 460, width: "100%" }}>
        <button onClick={() => navigate("/menu")} style={{ ...btnStyle, marginBottom: 16 }}>
          ← Back
        </button>
        <h2
          style={{
            fontFamily: "'Libre Baskerville',serif",
            fontSize: 22,
            color: "#e7e5e4",
            margin: "0 0 4px",
            textAlign: "center",
          }}
        >
          Tell me what to build next
        </h2>
        <p style={{ color: "#78716c", fontSize: 12, textAlign: "center", margin: "0 0 16px" }}>
          What would make the game more fun? What's broken?
        </p>

        {done && (
          <div
            style={{
              background: "#14532d",
              border: "1px solid #22c55e",
              borderRadius: 6,
              padding: "10px 14px",
              color: "#bbf7d0",
              fontSize: 13,
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Thanks! I got your note. More?
          </div>
        )}

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

        <form onSubmit={submit} style={{ ...cardStyle }}>
          <label
            style={{
              display: "block",
              fontSize: 10,
              color: "#78716c",
              textTransform: "uppercase",
              letterSpacing: ".08em",
              marginBottom: 4,
            }}
          >
            Type
          </label>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {[
              { id: "feature", label: "Feature" },
              { id: "bug", label: "Bug" },
              { id: "other", label: "Other" },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                style={{
                  ...btnStyle,
                  padding: "6px 12px",
                  background: category === c.id ? "#22c55e" : "none",
                  color: category === c.id ? "#fff" : "#ccc",
                  border: category === c.id ? "none" : "1px solid #555",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          <label
            style={{
              display: "block",
              fontSize: 10,
              color: "#78716c",
              textTransform: "uppercase",
              letterSpacing: ".08em",
              marginBottom: 4,
            }}
          >
            Your idea
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={5}
            placeholder="Can we have a Minecraft theme? Or a timer? Or a chat with friends?"
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />

          <button
            type="submit"
            disabled={busy || !body.trim()}
            style={{
              ...primaryBtnStyle,
              width: "100%",
              padding: 10,
              marginTop: 12,
              opacity: busy || !body.trim() ? 0.6 : 1,
            }}
          >
            {busy ? "Sending…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
