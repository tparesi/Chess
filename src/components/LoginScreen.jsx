import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn, signUp } from "../lib/auth.js";
import { hasSupabaseConfig, supabase } from "../lib/supabase.js";
import { SlopeSchoolTag, SummitBadge } from "./SummitBadge.jsx";
import {
  btnStyle,
  cardStyle,
  errorBoxStyle,
  inputStyle,
  labelStyle,
  primaryBtnStyle,
  screenStyle,
} from "./ui.js";

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
      <div style={{ maxWidth: 420, width: "100%" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <SummitBadge size="hero" drop />
          <SlopeSchoolTag style={{ marginTop: 20, animation: "fadeSlideUp 0.6s var(--ease) 0.15s both" }} />
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: "8px 0 4px",
              letterSpacing: "-0.02em",
              fontVariationSettings: '"SOFT" 50, "opsz" 144',
              animation: "fadeSlideUp 0.6s var(--ease) 0.22s both",
            }}
          >
            Slope Chess
          </h1>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
              margin: 0,
              animation: "fadeSlideUp 0.6s var(--ease) 0.3s both",
            }}
          >
            We're leading the climb.
          </p>
        </div>

        <form
          onSubmit={submit}
          style={{
            ...cardStyle,
            padding: "28px 32px",
            boxShadow: "var(--shadow-md)",
            animation: "fadeSlideUp 0.6s var(--ease) 0.4s both",
          }}
        >
          {!hasSupabaseConfig && (
            <div style={{ ...errorBoxStyle, marginBottom: 16 }}>
              Supabase is not configured. Copy <code>.env.example</code> to{" "}
              <code>.env.local</code> and fill in the values, then restart the dev server.
            </div>
          )}

          {mode === "signup" && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="What should we call you?"
                autoComplete="nickname"
                style={inputStyle}
              />
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              style={inputStyle}
            />
          </div>

          {err && <div style={{ ...errorBoxStyle, marginBottom: 14 }}>{err}</div>}

          <button
            type="submit"
            disabled={busy}
            style={{
              ...primaryBtnStyle,
              width: "100%",
              padding: "14px 20px",
              fontSize: "var(--text-base)",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? "Just a moment…" : mode === "signin" ? "Sign in" : "Start climbing"}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: "var(--text-sm)",
              padding: "12px 8px 0",
              cursor: "pointer",
              width: "100%",
              fontFamily: "var(--font-body)",
            }}
          >
            {mode === "signin"
              ? "New to Slope Chess? Create an account"
              : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
