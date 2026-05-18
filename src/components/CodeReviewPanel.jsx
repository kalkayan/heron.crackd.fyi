import { useState } from "react";

const VERDICT = {
  acceptable:      { label: "Acceptable",       bg: "#EDFBF3", border: "#B6EDD0", color: "#1A7A48", dot: "#28C840" },
  on_track:        { label: "On track",         bg: "#EEF0FB", border: "#C7CFF0", color: "#3D4DC2", dot: "#6B7FE0" },
  needs_work:      { label: "Needs work",       bg: "#FFF8EB", border: "#F0D9A0", color: "#A86B1A", dot: "#FFBD2E" },
  wrong_direction: { label: "Wrong direction",  bg: "#FFF0F0", border: "#F0C0C0", color: "#A82828", dot: "#FF5F57" },
};

const HINT_TYPE = {
  suggestion: { icon: "→", color: "#A86B1A", bg: "#FFF8EB", border: "#F0D9A0" },
  warning:    { icon: "⚠", color: "#A82828", bg: "#FFF0F0", border: "#F0C0C0" },
  positive:   { icon: "✓", color: "#1A7A48", bg: "#EDFBF3", border: "#B6EDD0" },
};

function VerdictChip({ verdict }) {
  const v = VERDICT[verdict];
  if (!v) return null;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 12px",
      borderRadius: 999,
      background: v.bg,
      border: `1px solid ${v.border}`,
      color: v.color,
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "-0.01em",
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: v.dot, display: "inline-block" }} />
      {v.label}
    </span>
  );
}

export function CodeReviewPanel({ review, onDismiss }) {
  const [hintsOpen, setHintsOpen] = useState(false);

  if (!review) return null;

  const { status, verdict, overall, inline_hints = [], approach_feedback, positive_notes } = review;

  if (status === "pending") {
    return (
      <div style={{
        background: "#FFFFFF",
        border: "1px solid #E5E2D8",
        borderRadius: 18,
        padding: "28px 24px",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          border: "2px solid #E0DDD3", borderTopColor: "#D97757",
          animation: "spin 0.8s linear infinite", flexShrink: 0,
        }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>Reviewing your code…</div>
          <div style={{ fontSize: 12, color: "#9A9A98", marginTop: 2 }}>Interviewer feedback in a few seconds</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div style={{
        background: "#FFF0F0",
        border: "1px solid #F0C0C0",
        borderRadius: 18,
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}>
        <div style={{ fontSize: 13, color: "#A82828" }}>Review failed — please try again.</div>
        <button type="button" onClick={onDismiss} style={_dismissBtn}>Dismiss</button>
      </div>
    );
  }

  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #E5E2D8",
      borderRadius: 14,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "18px 22px 14px",
        borderBottom: "1px solid #F4F1EA",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#9A9A98", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            Interviewer feedback
          </span>
          <VerdictChip verdict={verdict} />
        </div>
        <button type="button" onClick={onDismiss} style={_dismissBtn}>✕</button>
      </div>

      <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Overall */}
        {overall && (
          <p style={{ fontSize: 13, color: "#1A1A1A", lineHeight: 1.6, margin: 0 }}>
            {overall}
          </p>
        )}

        {/* Inline hints */}
        {inline_hints.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              type="button"
              onClick={() => setHintsOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 800, color: "#9A9A98", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                Line-level notes
              </span>
              <span style={{ fontSize: 10, color: "#B0ADA4", background: "#F4F1EA", borderRadius: 999, padding: "1px 7px", fontWeight: 600 }}>
                {inline_hints.length}
              </span>
              <span style={{ fontSize: 9, color: "#9A9A98", marginLeft: 2, transform: hintsOpen ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.15s" }}>▼</span>
            </button>
            {hintsOpen && inline_hints.map((h, i) => {
              const t = HINT_TYPE[h.type] || HINT_TYPE.suggestion;
              return (
                <div key={i} style={{
                  display: "flex",
                  gap: 10,
                  padding: "10px 14px",
                  background: t.bg,
                  border: `1px solid ${t.border}`,
                  borderRadius: 10,
                  alignItems: "flex-start",
                }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: t.color, flexShrink: 0, marginTop: 1 }}>
                    {t.icon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: t.color, marginRight: 6 }}>
                      Line {h.line}
                    </span>
                    <span style={{ fontSize: 12, color: "#1A1A1A", lineHeight: 1.5 }}>
                      {h.message}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Approach feedback */}
        {approach_feedback && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#9A9A98", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Approach
            </div>
            <p style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.6, margin: 0 }}>
              {approach_feedback}
            </p>
          </div>
        )}

        {/* Positive notes */}
        {positive_notes && (
          <div style={{
            padding: "10px 14px",
            background: "#EDFBF3",
            border: "1px solid #B6EDD0",
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#1A7A48", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>
              What you got right
            </div>
            <p style={{ fontSize: 12, color: "#1A7A48", lineHeight: 1.6, margin: 0 }}>
              {positive_notes}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

const _dismissBtn = {
  background: "transparent",
  border: "1px solid #E5E2D8",
  borderRadius: 8,
  color: "#9A9A98",
  fontSize: 11,
  fontWeight: 500,
  padding: "4px 10px",
  cursor: "pointer",
  fontFamily: "inherit",
};
