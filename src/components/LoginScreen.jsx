import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn, signUp } from "../lib/auth.js";
import { hasSupabaseConfig, supabase } from "../lib/supabase.js";
import { btnStyle, inputStyle, primaryBtnStyle, screenStyle } from "./ui.js";

export function LoginScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!displayName.trim()) throw new Error("Pick a display name");
        await signUp({ email: email.trim(), password, displayName: displayName.trim() });
        // Some Supabase projects require email confirmation — if so, show a
        // helpful message and let them sign in after they confirm.
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          navigate("/menu");
        } else {
          setErr("Account created. Check your email to confirm, then sign in.");
          setMode("signin");
        }
      } else {
        await signIn({ email: email.trim(), password });
        navigate("/menu");
      }
    } catch (e2) {
      setErr(e2.message || String(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={screenStyle}>
      <form onSubmit={submit} style={{ maxWidth: 360, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>♞</div>
        <h1
          style={{
            fontFamily: "'Libre Baskerville',serif",
            fontSize: "clamp(22px,5vw,32px)",
            color: "#e7e5e4",
            margin: "0 0 4px",
          }}
        >
          Chess
        </h1>
        <p style={{ color: "#78716c", fontSize: 13, margin: "0 0 24px", fontStyle: "italic" }}>
          {mode === "signin" ? "Sign in to play" : "Create an account"}
        </p>

        {!hasSupabaseConfig && (
          <div
            style={{
              background: "#7f1d1d",
              border: "1px solid #dc2626",
              color: "#fecaca",
              fontSize: 11,
              padding: 10,
              borderRadius: 6,
              marginBottom: 12,
              textAlign: "left",
            }}
          >
            Supabase is not configured. Copy <code>.env.example</code> to <code>.env.local</code>{" "}
            and fill in <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>,
            then restart the dev server.
          </div>
        )}

        {mode === "signup" && (
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name"
            autoComplete="nickname"
            style={{ ...inputStyle, marginBottom: 8 }}
          />
        )}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          style={{ ...inputStyle, marginBottom: 8 }}
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          style={{ ...inputStyle, marginBottom: 12 }}
        />

        {err && (
          <div
            style={{
              color: "#fecaca",
              background: "#7f1d1d",
              border: "1px solid #dc2626",
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 12,
              marginBottom: 10,
            }}
          >
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          style={{ ...primaryBtnStyle, width: "100%", padding: 10, fontSize: 14 }}
        >
          {busy ? "..." : mode === "signin" ? "Sign in" : "Sign up"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          style={{ ...btnStyle, width: "100%", marginTop: 8, border: "none", color: "#78716c" }}
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
