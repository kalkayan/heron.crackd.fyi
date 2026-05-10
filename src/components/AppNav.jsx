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

export function AppNav({ email, onLogout, loggingOut, actions }) {
  return (
    <header
      style={{
        borderBottom: "1px solid #E8E6E0",
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
          maxWidth: 1100,
          margin: "0 auto",
          padding: "0 40px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link to="/" style={{ textDecoration: "none" }}>
          <Logo />
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {actions}
          {email && (
            <span
              style={{
                fontSize: 13,
                color: "#9A9A98",
                padding: "0 4px",
              }}
            >
              {email}
            </span>
          )}
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
