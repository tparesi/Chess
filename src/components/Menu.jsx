import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useProfile } from "../hooks/useProfile.js";
import { signOut } from "../lib/auth.js";
import {
  btnStyle,
  headingStyle,
  menuDescStyle,
  menuItemStyle,
  menuLabelStyle,
  screenStyle,
} from "./ui.js";

const items = [
  { path: "/play", label: "Play", desc: "vs AI or another kid online", icon: "⚔️" },
  { path: "/puzzles", label: "Training Puzzles", desc: "Sharpen your tactics", icon: "🧩" },
  { path: "/leaderboard", label: "Leaderboard", desc: "Who's on top", icon: "🏆" },
  { path: "/feedback", label: "Feedback", desc: "Tell me what to build next", icon: "💬" },
];

export function Menu() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div style={screenStyle}>
      <div style={{ maxWidth: 460, width: "100%", textAlign: "center" }}>
        <h1 style={headingStyle}>Chess</h1>
        <p style={{ color: "#78716c", fontSize: 13, margin: "0 0 6px" }}>
          Welcome back, <span style={{ color: "#fbbf24" }}>{profile?.display_name ?? "…"}</span>
        </p>
        {profile && (
          <p style={{ color: "#a8a29e", fontSize: 11, margin: "0 0 20px" }}>
            ELO {profile.elo} · {profile.wins}W {profile.losses}L {profile.draws}D
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((m) => (
            <button key={m.path} onClick={() => navigate(m.path)} style={menuItemStyle}>
              <span style={{ fontSize: 24, minWidth: 32 }}>{m.icon}</span>
              <div>
                <span style={menuLabelStyle}>{m.label}</span>
                <span style={menuDescStyle}>{m.desc}</span>
              </div>
            </button>
          ))}
          <button
            onClick={handleSignOut}
            style={{ ...btnStyle, marginTop: 8, fontSize: 11, color: "#78716c" }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
