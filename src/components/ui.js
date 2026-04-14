// Shared style objects used across menu/game screens. Kept as plain JS
// because the original inline-style approach flows well with React.

export const screenStyle = {
  minHeight: "100vh",
  background: "linear-gradient(145deg,#1a1510,#2a2015,#1a1510)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "24px 16px",
  color: "#e7e5e4",
};

export const gameScreenStyle = {
  ...screenStyle,
  alignItems: "flex-start",
  padding: "20px 12px",
};

export const btnStyle = {
  padding: "8px 18px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: "12px",
  background: "none",
  border: "1px solid #555",
  color: "#ccc",
};

export const primaryBtnStyle = {
  ...btnStyle,
  background: "#22c55e",
  color: "#fff",
  border: "none",
};

export const menuItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  background: "rgba(255,255,255,.03)",
  border: "1px solid #44403c",
  borderRadius: 8,
  padding: "14px 18px",
  cursor: "pointer",
  textAlign: "left",
  transition: "all .15s",
  color: "#e7e5e4",
  width: "100%",
};

export const menuLabelStyle = {
  fontFamily: "'Libre Baskerville',serif",
  fontWeight: 700,
  fontSize: 15,
  display: "block",
};

export const menuDescStyle = {
  fontSize: 11,
  color: "#78716c",
  display: "block",
  marginTop: 1,
};

export const headingStyle = {
  fontFamily: "'Libre Baskerville',serif",
  fontSize: "clamp(22px,5vw,32px)",
  color: "#e7e5e4",
  margin: "0 0 4px",
};

export const subheadingStyle = {
  color: "#78716c",
  fontSize: 13,
  margin: "0 0 20px",
};

export const inputStyle = {
  background: "rgba(255,255,255,.06)",
  border: "1px solid #44403c",
  borderRadius: 6,
  padding: "10px 14px",
  color: "#e7e5e4",
  fontSize: 15,
  width: "100%",
  outline: "none",
};

export const cardStyle = {
  background: "#292118",
  border: "1px solid #44403c",
  borderRadius: 8,
  padding: "14px 16px",
};

export const PIECE_POINT_VALUES = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };

export function sortCapturedByValue(arr) {
  return [...arr].sort(
    (a, b) => PIECE_POINT_VALUES[b.toUpperCase()] - PIECE_POINT_VALUES[a.toUpperCase()]
  );
}
