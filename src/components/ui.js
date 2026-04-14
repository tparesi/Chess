// Shared style objects — all reference design tokens from tokens.css.
// Inline style for now because the rest of the app already is; the tokens
// make this maintainable without a full styled-components / CSS modules pass.

export const screenStyle = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "48px 24px",
  color: "var(--text-primary)",
};

export const gameScreenStyle = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  padding: "32px 16px",
  color: "var(--text-primary)",
};

export const btnStyle = {
  padding: "10px 20px",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  fontSize: "var(--text-sm)",
  fontWeight: 500,
  background: "var(--bg-raised)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
  fontFamily: "var(--font-body)",
  transition: "all var(--dur) var(--ease)",
  boxShadow: "var(--shadow-xs)",
};

export const primaryBtnStyle = {
  ...btnStyle,
  background: "var(--primary)",
  color: "var(--text-inverse)",
  border: "1px solid var(--primary)",
  fontWeight: 600,
  boxShadow: "var(--shadow-sm)",
};

export const ghostBtnStyle = {
  ...btnStyle,
  background: "transparent",
  border: "1px solid transparent",
  boxShadow: "none",
  color: "var(--text-secondary)",
};

// Menu tile — used on Menu + PlayMenu + Lobby
export const menuItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  background: "var(--bg-raised)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "20px 24px",
  cursor: "pointer",
  textAlign: "left",
  transition: "all var(--dur) var(--ease)",
  color: "var(--text-primary)",
  width: "100%",
  boxShadow: "var(--shadow-sm)",
  fontFamily: "var(--font-body)",
};

export const menuLabelStyle = {
  fontFamily: "var(--font-display)",
  fontWeight: 600,
  fontSize: "var(--text-md)",
  display: "block",
  color: "var(--text-primary)",
  letterSpacing: "-0.01em",
  lineHeight: 1.2,
};

export const menuDescStyle = {
  fontSize: "var(--text-sm)",
  color: "var(--text-secondary)",
  display: "block",
  marginTop: 2,
  fontWeight: 400,
};

export const headingStyle = {
  fontFamily: "var(--font-display)",
  fontSize: "var(--text-xl)",
  color: "var(--text-primary)",
  margin: "0 0 4px",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  lineHeight: 1.1,
  fontVariationSettings: '"SOFT" 30, "opsz" 144',
};

export const subheadingStyle = {
  color: "var(--text-secondary)",
  fontSize: "var(--text-sm)",
  margin: "0 0 24px",
};

export const inputStyle = {
  background: "var(--bg-raised)",
  border: "1.5px solid var(--border-strong)",
  borderRadius: "var(--radius-sm)",
  padding: "12px 16px",
  color: "var(--text-primary)",
  fontSize: "var(--text-base)",
  width: "100%",
  outline: "none",
  fontFamily: "var(--font-body)",
  transition: "all var(--dur) var(--ease)",
};

export const cardStyle = {
  background: "var(--bg-raised)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "24px 28px",
  boxShadow: "var(--shadow-sm)",
};

export const errorBoxStyle = {
  background: "var(--error-tint)",
  border: "1px solid var(--error)",
  color: "var(--error)",
  fontSize: "var(--text-sm)",
  padding: "10px 14px",
  borderRadius: "var(--radius-sm)",
};

export const successBoxStyle = {
  background: "var(--success-tint)",
  border: "1px solid var(--success)",
  color: "var(--success)",
  fontSize: "var(--text-sm)",
  padding: "10px 14px",
  borderRadius: "var(--radius-sm)",
};

// Label style for form fields and section titles
export const labelStyle = {
  display: "block",
  fontSize: "var(--text-xs)",
  color: "var(--text-tertiary)",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontWeight: 600,
  marginBottom: 6,
};

export const PIECE_POINT_VALUES = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };

export function sortCapturedByValue(arr) {
  return [...arr].sort(
    (a, b) => PIECE_POINT_VALUES[b.toUpperCase()] - PIECE_POINT_VALUES[a.toUpperCase()]
  );
}
