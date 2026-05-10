import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/utils";

const DOTS_BG = {
  background: "#F4F1EA",
  backgroundImage: "radial-gradient(circle, #D8D6CE 1px, transparent 1px)",
  backgroundSize: "16px 16px",
};

const COMPANY_PALETTE = {
  Stripe: "#635BFF",
  Google: "#4285F4",
  Meta: "#0866FF",
  Amazon: "#FF9900",
  Notion: "#1A1A1A",
  Airbnb: "#FF5A5F",
  Datadog: "#632CA6",
  Linear: "#5E6AD2",
};

const TIMELINE_OPTIONS = [
  { label: "2 weeks", weeks: 2 },
  { label: "4 weeks", weeks: 4 },
  { label: "6 weeks", weeks: 6 },
  { label: "3 months", weeks: 12 },
];

const SUGGESTIONS = [
  "I'm rusty on dynamic programming.",
  "I freeze on system design.",
  "3-year break, returning to interviews.",
];

function Logo({ size = 15 }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: size,
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

function Sparkle() {
  return (
    <svg width={11} height={11} viewBox="0 0 12 12" fill="none">
      <path d="M6 0L7.2 4.8L12 6L7.2 7.2L6 12L4.8 7.2L0 6L4.8 4.8L6 0Z" fill="#D97757" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Check() {
  return (
    <svg width={12} height={12} viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7L5.8 10L11.5 4" stroke="#D97757" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Arrow({ size = 12, color = "currentColor" }) {
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

function CompanyMark({ name, size = 16 }) {
  const bg = COMPANY_PALETTE[name] || "#6B6B6B";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: Math.max(3, size * 0.22),
        background: bg,
        color: "#FFFFFF",
        fontSize: size * 0.52,
        fontWeight: 600,
        letterSpacing: "-0.02em",
        flexShrink: 0,
      }}
    >
      {name[0]}
    </span>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 4V7L9 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 2V10M2 6H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M5 7C5.5 7.6 6.4 7.6 6.9 7L9 4.9C9.6 4.4 9.6 3.5 9 2.9C8.5 2.4 7.6 2.4 7 2.9L6.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M7 5C6.5 4.4 5.6 4.4 5.1 5L3 7.1C2.4 7.6 2.4 8.5 3 9.1C3.5 9.6 4.4 9.6 5 9.1L5.5 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function CompanyPill({ company, companies, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "#FFFFFF",
          border: "1px solid #E0DDD3",
          borderRadius: 999,
          padding: "7px 12px 7px 10px",
          fontSize: 13,
          fontWeight: 500,
          color: "#1A1A1A",
          cursor: "pointer",
          fontFamily: "inherit",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        {company ? <CompanyMark name={company.name} size={16} /> : null}
        <span style={{ color: "#9A9A98", fontWeight: 400 }}>Company</span>
        <span>{company ? company.name : "—"}</span>
        <ChevronDown />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            minWidth: 220,
            background: "#FFFFFF",
            border: "1px solid #E5E2D8",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            padding: 6,
            zIndex: 10,
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {companies.map((c) => (
            <div
              key={c.id}
              onClick={() => { onChange(c); setOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                fontSize: 13,
                cursor: "pointer",
                background: company?.id === c.id ? "#F4F1EA" : "transparent",
                fontWeight: company?.id === c.id ? 500 : 400,
              }}
              onMouseEnter={(e) => { if (company?.id !== c.id) e.currentTarget.style.background = "#FAF8F2"; }}
              onMouseLeave={(e) => { if (company?.id !== c.id) e.currentTarget.style.background = "transparent"; }}
            >
              <CompanyMark name={c.name} size={18} />
              <span style={{ flex: 1 }}>{c.name}</span>
              {company?.id === c.id && <Check />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimelinePill({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = TIMELINE_OPTIONS.find((o) => o.weeks === value);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "#FFFFFF",
          border: "1px solid #E0DDD3",
          borderRadius: 999,
          padding: "7px 12px 7px 10px",
          fontSize: 13,
          fontWeight: 500,
          color: "#1A1A1A",
          cursor: "pointer",
          fontFamily: "inherit",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <span style={{ color: "#6B6B6B" }}><ClockIcon /></span>
        <span style={{ color: "#9A9A98", fontWeight: 400 }}>Interview in</span>
        <span>{selected ? selected.label : "—"}</span>
        <ChevronDown />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            minWidth: 180,
            background: "#FFFFFF",
            border: "1px solid #E5E2D8",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            padding: 6,
            zIndex: 10,
          }}
        >
          {TIMELINE_OPTIONS.map((opt) => (
            <div
              key={opt.weeks}
              onClick={() => { onChange(opt.weeks); setOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                fontSize: 13,
                cursor: "pointer",
                background: value === opt.weeks ? "#F4F1EA" : "transparent",
                fontWeight: value === opt.weeks ? 500 : 400,
              }}
              onMouseEnter={(e) => { if (value !== opt.weeks) e.currentTarget.style.background = "#FAF8F2"; }}
              onMouseLeave={(e) => { if (value !== opt.weeks) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ flex: 1 }}>{opt.label}</span>
              {value === opt.weeks && <Check />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StaticPill({ icon, label, value }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: "rgba(255,255,255,0.7)",
        border: "1px solid #E5E2D8",
        borderRadius: 999,
        padding: "7px 14px 7px 12px",
        fontSize: 13,
        fontWeight: 500,
        color: "#6B6B6B",
      }}
    >
      <span style={{ color: "#9A9A98", display: "inline-flex" }}>{icon}</span>
      <span style={{ color: "#9A9A98", fontWeight: 400 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function RoleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="5" r="2.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 12C2.5 9.8 4.5 8 7 8C9.5 8 11.5 9.8 11.5 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function StackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2L12 4.5L7 7L2 4.5L7 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M2 7L7 9.5L12 7M2 9.5L7 12L12 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [timelineWeeks, setTimelineWeeks] = useState(4);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/user/companies")
      .then((r) => r?.json())
      .then((data) => {
        const list = data?.companies || [];
        setCompanies(list);
        if (list.length > 0) setSelectedCompany(list[0]);
      })
      .catch(() => {});
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!selectedCompany) {
      setError("Please select a company.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const resp = await apiFetch("/api/user/sessions", {
        method: "POST",
        body: JSON.stringify({
          company_id: selectedCompany.id,
          timeline_weeks: timelineWeeks,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Unable to create session.");
        return;
      }
      navigate(`/session/${data.id}`, { replace: true });
    } catch {
      setError("Unable to create session.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", ...DOTS_BG }}>
      {/* Top bar */}
      <div
        style={{
          padding: "22px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link to="/" style={{ textDecoration: "none" }}>
          <Logo size={14} />
        </Link>
        <Link
          to="/dashboard"
          style={{ fontSize: 12, color: "#6B6B6B", textDecoration: "none" }}
        >
          Skip to dashboard →
        </Link>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "80px 40px 80px" }}>
        {/* Welcome pill */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px 6px 12px",
              background: "#FFFFFF",
              border: "1px solid #E8E8E6",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 500,
              color: "#D97757",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            }}
          >
            <Sparkle />
            Welcome — let's build your plan
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 64px)",
            fontWeight: 700,
            letterSpacing: "-0.035em",
            lineHeight: 1.02,
            textAlign: "center",
            margin: 0,
            fontFamily: "Martel Sans, sans-serif",
            color: "#1A1A1A",
          }}
        >
          Welcome to crackd<span style={{ color: "#D97757" }}>.fyi</span>
        </h1>
        <p
          style={{
            marginTop: 18,
            fontSize: 16,
            color: "#6B6B6B",
            textAlign: "center",
            maxWidth: 480,
            margin: "18px auto 0",
            lineHeight: 1.55,
          }}
        >
          Tell us where you're headed and we'll build a prep plan around what they actually test.
        </p>

        {/* Pills row */}
        <form onSubmit={handleCreate}>
          <div
            style={{
              marginTop: 52,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
            }}
          >
            <CompanyPill
              company={selectedCompany}
              companies={companies}
              onChange={setSelectedCompany}
            />
            <TimelinePill value={timelineWeeks} onChange={setTimelineWeeks} />
            <StaticPill icon={<RoleIcon />} label="Role" value="Senior SWE" />
            <StaticPill icon={<StackIcon />} label="Stack" value="Backend" />
          </div>

          {/* Textarea card */}
          <div
            style={{
              marginTop: 18,
              background: "#FFFFFF",
              border: "1px solid #E5E2D8",
              borderRadius: 18,
              padding: "18px 20px 14px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 8px 28px rgba(0,0,0,0.04)",
            }}
          >
            <textarea
              placeholder={`Anything else we should know? e.g. "I'm rusty on graphs, last interviewed 3 years ago, prefer Python."`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                border: 0,
                outline: 0,
                background: "transparent",
                resize: "none",
                fontFamily: "inherit",
                fontSize: 15,
                lineHeight: 1.55,
                color: "#1A1A1A",
                boxSizing: "border-box",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
                paddingTop: 12,
                borderTop: "1px solid #F0EEE8",
              }}
            >
              <button
                type="button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "none",
                  border: "none",
                  padding: "6px 10px",
                  fontSize: 12,
                  color: "#6B6B6B",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  borderRadius: 6,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <PlusIcon /> Attach resume
              </button>
              <button
                type="button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "none",
                  border: "none",
                  padding: "6px 10px",
                  fontSize: 12,
                  color: "#6B6B6B",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  borderRadius: 6,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <LinkIcon /> Job description URL
              </button>
              <div style={{ flex: 1 }} />
              {selectedCompany && (
                <span style={{ fontSize: 11, color: "#9A9A98", marginRight: 4 }}>
                  {selectedCompany.name} · {TIMELINE_OPTIONS.find((o) => o.weeks === timelineWeeks)?.label}
                </span>
              )}
              <button
                type="submit"
                disabled={loading || !selectedCompany}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: loading || !selectedCompany ? "#9A9A98" : "#D97757",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 999,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: loading || !selectedCompany ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  transition: "background 0.15s",
                }}
              >
                {loading ? "Creating…" : "Create session"}
                {!loading && <Arrow size={12} color="#FFFFFF" />}
              </button>
            </div>
          </div>

          {error && (
            <p style={{ marginTop: 12, textAlign: "center", fontSize: 13, color: "#C0392B" }}>
              {error}
            </p>
          )}
        </form>

        {/* Suggestion pills */}
        <div
          style={{
            marginTop: 28,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "center",
          }}
        >
          {SUGGESTIONS.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => setNotes(text)}
              style={{
                background: "transparent",
                border: "1px dashed #C8C5BB",
                borderRadius: 999,
                padding: "6px 14px",
                fontSize: 12.5,
                color: "#6B6B6B",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#1A1A1A";
                e.currentTarget.style.color = "#1A1A1A";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#C8C5BB";
                e.currentTarget.style.color = "#6B6B6B";
              }}
            >
              {text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
