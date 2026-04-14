export function CheckFlash({ row, col }) {
  return (
    <div
      style={{
        position: "absolute",
        top: `${row * 12.5}%`,
        left: `${col * 12.5}%`,
        width: "12.5%",
        height: "12.5%",
        zIndex: 40,
        pointerEvents: "none",
        animation: "checkPulse 1.5s ease-out forwards",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(208, 74, 58, 0.55) 0%, transparent 70%)",
          animation: "checkRipple 1s ease-out infinite",
        }}
      />
    </div>
  );
}
