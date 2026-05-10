import { Link } from "react-router-dom";

const DOTS_BG = {
  background: "#F4F1EA",
  backgroundImage: "radial-gradient(circle, #D8D6CE 1px, transparent 1px)",
  backgroundSize: "16px 16px",
};

function Logo({ size = 15 }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: size,
        color: "#1A1A1A",
        fontFamily: "inherit",
        fontWeight: 600,
        letterSpacing: "-0.02em",
        textDecoration: "none",
      }}
    >
      <span>
        crackd<span style={{ color: "#D97757" }}>.fyi</span>
      </span>
    </span>
  );
}

function Arrow({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M3 8H13M13 8L8.5 3.5M13 8L8.5 12.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DiffRow({ left, right }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 60px 1fr",
        alignItems: "center",
        gap: 20,
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 400,
          color: "#9A9A98",
          letterSpacing: "-0.01em",
          textDecoration: "line-through",
          textDecorationColor: "rgba(154,154,152,0.4)",
        }}
      >
        {left}
      </div>
      <div style={{ display: "flex", justifyContent: "center", color: "#D97757" }}>
        <Arrow size={20} color="#D97757" />
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: "#1A1A1A",
          letterSpacing: "-0.015em",
          fontFamily: "Martel Sans, sans-serif",
        }}
      >
        {right}
      </div>
    </div>
  );
}

export function HomePage() {
  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden", ...DOTS_BG }}>
      {/* Header */}
      <header
        style={{
          position: "relative",
          padding: "26px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link to="/" style={{ textDecoration: "none" }}>
          <Logo size={15} />
        </Link>
        <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <a href="#" style={{ color: "#1A1A1A", fontSize: 13.5, textDecoration: "none", fontWeight: 500 }}>
            Product
          </a>
          <a href="#" style={{ color: "#1A1A1A", fontSize: 13.5, textDecoration: "none", fontWeight: 500 }}>
            Companies
          </a>
          <a href="#" style={{ color: "#1A1A1A", fontSize: 13.5, textDecoration: "none", fontWeight: 500 }}>
            Pricing
          </a>
          <a href="#" style={{ color: "#1A1A1A", fontSize: 13.5, textDecoration: "none", fontWeight: 500 }}>
            Blog
          </a>
        </nav>
        <Link
          to="/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#1A1A1A",
            color: "#FFFFFF",
            borderRadius: 999,
            padding: "8px 18px",
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          Sign in <Arrow size={12} color="#FFFFFF" />
        </Link>
      </header>

      {/* Hero */}
      <section
        style={{
          position: "relative",
          padding: "250px 40px 120px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1
            style={{
              fontSize: "clamp(40px, 8vw, 80px)",
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              color: "#1A1A1A",
              maxWidth: 1000,
              margin: "0 auto",
              fontFamily: "Martel Sans, sans-serif",
            }}
          >
            Built around the company. <br />Built around you.
          </h1>
          <p
            style={{
              marginTop: 28,
              fontSize: 18,
              color: "#6B6B6B",
              maxWidth: 560,
              margin: "28px auto 0",
              lineHeight: 1.6,
            }}
          >
            Crackd builds your prep around what Stripe, Google, and Meta actually
            test — not a generic problem list.
          </p>
          <div
            style={{
              marginTop: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                background: "#1A1A1A",
                color: "#FFFFFF",
                borderRadius: 999,
                padding: "13px 24px",
                fontSize: 14.5,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#D97757",
                  flexShrink: 0,
                }}
              />
              Start preparing
            </Link>
            <button
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#FFFFFF",
                color: "#1A1A1A",
                border: "1px solid #1A1A1A",
                borderRadius: 999,
                padding: "13px 22px",
                fontSize: 14.5,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              See how it works
            </button>
          </div>
        </div>
      </section>

      {/* Company strip */}
      <section
        style={{
          position: "relative",
          padding: "0 40px 80px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: "#9A9A98",
            marginBottom: 24,
          }}
        >
          Trained on real interview data from
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 48,
            flexWrap: "wrap",
          }}
        >
          {["Stripe", "Google", "Meta", "Amazon", "Notion"].map((name) => (
            <span
              key={name}
              style={{
                color: "#1A1A1A",
                opacity: 0.4,
                fontSize: 17,
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* What makes it different */}
      <section style={{ position: "relative", padding: "60px 40px 120px" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "#9A9A98",
              marginBottom: 36,
              textAlign: "center",
            }}
          >
            What makes it different
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <DiffRow
              left="A pile of LeetCode problems"
              right="A strategy built around your target company"
            />
            <div style={{ height: 1, background: "#E8E6E0" }} />
            <DiffRow
              left="Generic difficulty curves"
              right="Frequencies pulled from 2,800+ real reports"
            />
            <div style={{ height: 1, background: "#E8E6E0" }} />
            <DiffRow
              left="A grind that hopes for luck"
              right="A plan that closes your specific gaps"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          position: "relative",
          padding: "28px 40px",
          borderTop: "1px solid #E8E6E0",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <Logo size={13} />
          <span style={{ fontSize: 12, color: "#9A9A98" }}>
            Built for engineers targeting Tier-1.
          </span>
        </div>
      </footer>
    </div>
  );
}
