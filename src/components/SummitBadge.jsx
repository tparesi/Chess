// The one visual anchor: a dark alpine-slate rounded tile holding the white
// Slope Mountain logo. Used everywhere we want to say "this is Slope".
// Variants:
//   size="hero"    140px, for LoginScreen
//   size="header"  48px,  for screen headers with wordmark
//   size="compact" 32px,  for modals and tight corners

const SIZES = {
  hero: 140,
  header: 48,
  compact: 32,
};

export function SummitBadge({
  size = "header",
  showWordmark = false,
  subtitle = null,
  drop = false,
}) {
  const px = typeof size === "number" ? size : SIZES[size] ?? 48;
  const isLarge = px >= 80;
  const radius = isLarge ? "var(--radius-lg)" : "var(--radius-sm)";
  const wordmarkSize = px >= 120 ? "var(--text-2xl)" : px >= 60 ? "var(--text-xl)" : "var(--text-lg)";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: px >= 80 ? 18 : 14,
        animation: drop ? "summitDrop 0.7s var(--ease-overshoot) both" : undefined,
      }}
    >
      <div
        style={{
          width: px,
          height: px,
          background: "var(--summit)",
          borderRadius: radius,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.04)`,
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* subtle radial sheen */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08), transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <img
          src="/slope-logo.png"
          alt="Slope"
          style={{
            width: `${Math.round(px * 0.74)}px`,
            height: `${Math.round(px * 0.74)}px`,
            objectFit: "contain",
            position: "relative",
            zIndex: 1,
          }}
        />
      </div>
      {showWordmark && (
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: wordmarkSize,
              color: "var(--text-primary)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              fontVariationSettings: '"SOFT" 30, "opsz" 144',
            }}
          >
            Slope Chess
          </div>
          {subtitle && (
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontWeight: 500,
                fontSize: "var(--text-sm)",
                color: "var(--text-secondary)",
                marginTop: 2,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// The small "SLOPE SCHOOL" uppercase wordmark under the hero badge.
export function SlopeSchoolTag({ style }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-body)",
        fontWeight: 600,
        fontSize: "var(--text-xs)",
        letterSpacing: "0.22em",
        color: "var(--text-tertiary)",
        textTransform: "uppercase",
        textAlign: "center",
        ...style,
      }}
    >
      Slope School
    </div>
  );
}
