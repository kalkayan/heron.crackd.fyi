import { Link } from "react-router-dom";

function Logo() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 15,
        color: "#1A1A1A",
        fontWeight: 600,
        letterSpacing: "-0.02em",
      }}
    >
      crackd<span style={{ color: "#D97757" }}>.fyi</span>
    </span>
  );
}

export function AppNav({ email, onLogout, loggingOut, actions, leftAction, aiUsage }) {
  return (
    <header
      style={{
        background: "#F4F1EA",
        backgroundImage: "radial-gradient(circle, #D8D6CE 1px, transparent 1px)",
        backgroundSize: "16px 16px",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "0 40px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, flex: 1, height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
              <Logo />
            </Link>
            {leftAction}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {aiUsage && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 600,
              color: "#9A9A98",
              marginRight: 8,
            }}>
              <span style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>AI</span>
              <div style={{
                width: 48,
                height: 4,
                borderRadius: 999,
                background: "#E5E2D8",
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  borderRadius: 999,
                  width: `${Math.min(100, (aiUsage.weekly_used / aiUsage.weekly_limit) * 100)}%`,
                  background: aiUsage.weekly_used / aiUsage.weekly_limit >= 0.9 ? "#A82828" : "#D97757",
                  transition: "width 0.3s ease",
                }} />
              </div>
              <span style={{ color: "#1A1A1A", fontVariantNumeric: "tabular-nums" }}>
                {aiUsage.weekly_used.toFixed(1)}<span style={{ color: "#B0ADA4" }}>/{aiUsage.weekly_limit}</span>
              </span>
            </div>
          )}
          {actions}
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            style={{
              background: "none",
              border: "1px solid #E0DDD3",
              borderRadius: 999,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 500,
              color: loggingOut ? "#9A9A98" : "#1A1A1A",
              cursor: loggingOut ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => { if (!loggingOut) e.currentTarget.style.borderColor = "#9A9A98"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E0DDD3"; }}
          >
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </header>
  );
}

