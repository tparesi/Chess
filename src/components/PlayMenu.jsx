import { useNavigate } from "react-router-dom";
import {
  btnStyle,
  menuDescStyle,
  menuItemStyle,
  menuLabelStyle,
  screenStyle,
} from "./ui.js";

const modes = [
  { id: "online", label: "Online PvP", desc: "Play live against another kid", icon: "🌐", path: "/lobby" },
  { id: "easy", label: "Easy AI", desc: "Mostly random", icon: "🌱", path: "/play/ai/easy" },
  { id: "medium", label: "Medium AI", desc: "Thinks 2 moves ahead", icon: "🧠", path: "/play/ai/medium" },
  { id: "hard", label: "Hard AI", desc: "Thinks 3 moves ahead", icon: "🔥", path: "/play/ai/hard" },
];

export function PlayMenu() {
  const navigate = useNavigate();
  return (
    <div style={screenStyle}>
      <div style={{ maxWidth: 460, width: "100%", textAlign: "center" }}>
        <button
          onClick={() => navigate("/menu")}
          style={{ ...btnStyle, marginBottom: 16 }}
        >
          ← Back
        </button>
        <h2 style={{ fontFamily: "'Libre Baskerville',serif", fontSize: 22, margin: "0 0 16px" }}>
          Choose Your Battle
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {modes.map((m) => (
            <button key={m.id} onClick={() => navigate(m.path)} style={menuItemStyle}>
              <span style={{ fontSize: 24, minWidth: 32 }}>{m.icon}</span>
              <div>
                <span style={menuLabelStyle}>{m.label}</span>
                <span style={menuDescStyle}>{m.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
