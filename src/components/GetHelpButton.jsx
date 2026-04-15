import { useEffect, useRef, useState } from "react";
import { btnStyle } from "./ui.js";

// Opt-in prospective help. The kid taps the button, we run the coach's
// analyzeCurrentPosition, and show the top suggestion in a small popover
// that floats below the button. Tapping again (or clicking outside) closes.
//
// Props:
//   getTip: () => Tip | null — called on each open
//   disabled: boolean
export function GetHelpButton({ getTip, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [tip, setTip] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) setOpen(false);
    };
    // Delay one tick so the click that opened it doesn't also close it
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handler);
    };
  }, [open]);

  const toggle = () => {
    if (disabled) return;
    if (open) {
      setOpen(false);
      return;
    }
    setTip(getTip());
    setOpen(true);
  };

  return (
    <div style={{ position: "relative" }} ref={containerRef}>
      <button
        onClick={toggle}
        disabled={disabled}
        style={{
          ...btnStyle,
          background: open ? "var(--accent-tint)" : "var(--bg-raised)",
          borderColor: open ? "var(--accent)" : "var(--border)",
          color: open ? "var(--accent-hover)" : "var(--text-primary)",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>💡</span>
        Get Help
      </button>

      {open && (
        <div
          role="dialog"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 260,
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "14px 16px",
            boxShadow: "var(--shadow-lg)",
            zIndex: 30,
            animation: "fadeSlideUp 0.2s var(--ease)",
          }}
        >
          {tip ? (
            <>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "var(--text-sm)",
                  color:
                    tip.kind === "warning"
                      ? "var(--error)"
                      : tip.kind === "positive"
                        ? "var(--success)"
                        : "var(--primary)",
                  marginBottom: 6,
                  lineHeight: 1.2,
                  letterSpacing: "-0.01em",
                }}
              >
                {tip.title}
              </div>
              <div
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                {tip.message}
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  ...btnStyle,
                  marginTop: 12,
                  width: "100%",
                  padding: "8px 14px",
                  fontSize: "var(--text-xs)",
                }}
              >
                Got it
              </button>
            </>
          ) : (
            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)" }}>
              No tip available.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
