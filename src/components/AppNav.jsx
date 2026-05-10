import { Link } from "react-router-dom";

function Logo() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 15,
        color: "#1A1A1A",
        fontWeight: 600,
        letterSpacing: "-0.02em",
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          background: "#D97757",
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      <span>
        crackd<span style={{ color: "#D97757" }}>.fyi</span>
      </span>
    </span>
  );
}

export function AppNav({ email, onLogout, loggingOut, actions }) {
  return (
    <header
      style={{
        borderBottom: "1px solid #E8E6E0",
        background: "#F4F1EA",
        position: "sticky",
        top: 0,
        zIndex: 40,
        backdropFilter: "blur(8px)",
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
