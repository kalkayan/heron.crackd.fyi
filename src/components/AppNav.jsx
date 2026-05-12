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

export function AppNav({ email, onLogout, loggingOut, actions, leftAction, credits = 10 }) {
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
          {credits !== undefined && (
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 6, 
              fontSize: 11, 
              fontWeight: 700, 
              color: "#9A9A98", 
              textTransform: "uppercase", 
              letterSpacing: "0.1em",
              marginRight: 8
            }}>
              AI credits used 
              <span style={{ color: "#D97757" }}>→</span>
              <span style={{ color: "#1A1A1A" }}>{credits}</span>
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

