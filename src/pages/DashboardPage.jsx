import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppNav } from "../components/AppNav";
import { apiFetch } from "../lib/utils";

const CARD_CLASS = "bg-white border border-[#E5E2D8] rounded-[24px] p-8 shadow-[0_2px_8px_rgba(0,0,0,0.02)]";

const STATUS_COLORS = {
  active:    { bg: "#EDFBF3", border: "#B6EDD0", text: "#1A7A48" },
  completed: { bg: "#F1EFE3", border: "#D8D2B8", text: "#6B5A3A" },
  abandoned: { bg: "#F5F4F1", border: "#E0DDD3", text: "#9A9A98" },
};

function StatusChip({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.abandoned;
  return (
    <span
      className="px-2 py-0.5 rounded text-[10px] font-bold border capitalize"
      style={{ background: c.bg, borderColor: c.border, color: c.text }}
    >
      {status}
    </span>
  );
}

function PlanDot({ planStatus }) {
  if (planStatus === "generating") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-[#9A9A98] font-medium">
        <span style={{
          display: "inline-block", width: 8, height: 8, borderRadius: "50%",
          border: "1.5px solid #E0DDD3", borderTopColor: "#D97757",
          animation: "spin 0.8s linear infinite", flexShrink: 0,
        }} />
        Building plan…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-[#1A7A48] font-medium">
      <span className="w-2 h-2 rounded-full bg-[#1A7A48] flex-shrink-0" />
      Plan ready
    </span>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [aiUsage, setAiUsage] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [deletingSessionId, setDeletingSessionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [meResp, sessionsResp] = await Promise.all([
          apiFetch("/api/user/auth/me"),
          apiFetch("/api/user/sessions"),
        ]);
        const [meData, sessionsData] = await Promise.all([
          meResp ? meResp.json() : null,
          sessionsResp ? sessionsResp.json() : null,
        ]);
        setEmail(meData?.email || "");
        setAiUsage(meData?.ai_usage || null);
        const loadedSessions = sessionsData?.sessions || [];
        setSessions(loadedSessions);

        const activeSessions = loadedSessions.filter((s) => s.status === "active");
        const skipAutoRedirect = searchParams.get("from") === "session";
        if (!skipAutoRedirect && loadedSessions.length === 0) {
          navigate("/start", { replace: true });
          return;
        }
        if (!skipAutoRedirect && activeSessions.length === 1) {
          navigate(`/session/${activeSessions[0].id}`, { replace: true });
          return;
        }
      } catch {
        setError("Unable to load your dashboard.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [navigate, searchParams]);

  const activeSessions = useMemo(() => sessions.filter((s) => s.status === "active"), [sessions]);
  const pastSessions = useMemo(() => sessions.filter((s) => s.status !== "active"), [sessions]);

  const firstName = email ? email.split("@")[0].split(".")[0] : "";
  const greeting = firstName
    ? firstName.charAt(0).toUpperCase() + firstName.slice(1)
    : null;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiFetch("/api/user/auth/logout", { method: "POST" });
    } finally {
      localStorage.removeItem("crackd_user_token");
      navigate("/", { replace: true });
      setLoggingOut(false);
    }
  }

  async function deleteSession(sessionId) {
    if (!window.confirm("Delete this session? This will remove the study plan and session history.")) return;
    setDeletingSessionId(sessionId);
    setError("");
    try {
      const resp = await apiFetch(`/api/user/sessions/${sessionId}`, { method: "DELETE" });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error || "Unable to delete session."); return; }
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      setError("Unable to delete session.");
    } finally {
      setDeletingSessionId("");
    }
  }

  return (
    <div className="min-h-screen">
      <AppNav email={email} onLogout={handleLogout} loggingOut={loggingOut} aiUsage={aiUsage} />

      <main className="max-w-[1240px] mx-auto px-10 pb-32 pt-12">
        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              border: "2px solid #E0DDD3", borderTopColor: "#1A1A1A",
              animation: "spin 0.8s linear infinite",
            }} />
          </div>
        ) : (
          <>
            {error && <p className="text-[13px] text-[#A82828] mb-8">{error}</p>}

            {/* ── Header ── */}
            <div className="flex items-end justify-between mb-16">
              <div>
                <p className="text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em] mb-3">Dashboard</p>
                <h1 className="font-heading text-[48px] font-black tracking-tight text-[#1A1A1A] leading-none">
                  {greeting ? `Welcome back, ${greeting}` : "Welcome back"}
                </h1>
              </div>
              <Link
                to="/start"
                className="bg-[#D97757] hover:bg-[#E0886A] text-white! px-6 py-3 rounded-2xl text-[14px] font-bold flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                + New session
              </Link>
            </div>

            {/* ── Active sessions ── */}
            {activeSessions.length > 0 && (
              <section className="mb-16">
                <p className="text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em] mb-6">
                  Active{activeSessions.length > 1 ? ` · ${activeSessions.length}` : ""}
                </p>

                {activeSessions.length === 1 ? (
                  /* Featured single active session */
                  <div className="bg-white border border-[#E5E2D8] rounded-[24px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex">
                    {/* Left — tinted content area */}
                    <div className="flex-1 bg-[#F9F7F3] px-10 py-10 flex flex-col justify-center relative overflow-hidden">
                      {/* Ghost letter */}
                      <span
                        className="absolute right-6 top-1/2 -translate-y-1/2 font-heading font-black leading-none select-none pointer-events-none"
                        style={{ fontSize: 160, color: "#E8E3D8", letterSpacing: "-0.04em" }}
                        aria-hidden="true"
                      >
                        {activeSessions[0].company_name[0]}
                      </span>
                      <p className="text-[10px] font-black text-[#D97757] uppercase tracking-[0.2em] mb-4 relative">Current prep</p>
                      <h2 className="font-heading text-[44px] font-black tracking-tight text-[#1A1A1A] leading-none mb-5 relative">
                        {activeSessions[0].company_name}
                      </h2>
                      <div className="flex items-center gap-4 relative">
                        {activeSessions[0].timeline_weeks && (
                          <span className="text-[12px] text-[#9A9A98] font-medium">
                            {activeSessions[0].timeline_weeks} weeks
                          </span>
                        )}
                        <PlanDot planStatus={activeSessions[0].plan_status} />
                      </div>
                    </div>
                    {/* Right — actions */}
                    <div className="w-[260px] flex-shrink-0 border-l border-[#F0EEE6] px-8 py-10 flex flex-col justify-center gap-3">
                      <Link
                        to={`/companies/${activeSessions[0].company_id}`}
                        className="bg-[#D97757] hover:bg-[#E0886A] text-white! py-4 rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Open plan →
                      </Link>
                      <Link
                        to={`/session/${activeSessions[0].id}`}
                        className="bg-white hover:bg-[#F9F7F3] border border-[#E5E2D8] text-[#6B6B6B] py-3 rounded-2xl text-[13px] font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        Practice session →
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* List for multiple active sessions */
                  <div className={CARD_CLASS}>
                    {activeSessions.map((s, i) => (
                      <div
                        key={s.id}
                        className={`flex items-center gap-6 py-5 ${i > 0 ? "border-t border-[#F4F1EA]" : ""}`}
                      >
                        <h3 className="font-heading text-[20px] font-black tracking-tight text-[#1A1A1A] flex-1">
                          {s.company_name}
                        </h3>
                        {s.timeline_weeks && (
                          <span className="text-[12px] text-[#9A9A98] font-medium">{s.timeline_weeks} weeks</span>
                        )}
                        <PlanDot planStatus={s.plan_status} />
                        <Link
                          to={`/companies/${s.company_id}`}
                          className="text-[12px] font-bold text-[#D97757] hover:underline"
                        >
                          Open plan →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ── Past sessions ── */}
            {pastSessions.length > 0 && (
              <section>
                <p className="text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em] mb-6">Past sessions</p>
                <div className={CARD_CLASS}>
                  {pastSessions.map((s, i) => (
                    <div
                      key={s.id}
                      className={`flex items-center gap-6 py-4 ${i > 0 ? "border-t border-[#F4F1EA]" : ""}`}
                    >
                      <span className="text-[15px] font-bold text-[#1A1A1A] flex-1">{s.company_name}</span>
                      {s.timeline_weeks && (
                        <span className="text-[12px] text-[#9A9A98] font-medium">{s.timeline_weeks} weeks</span>
                      )}
                      <StatusChip status={s.status} />
                      <Link
                        to={`/companies/${s.company_id}`}
                        className="text-[11px] font-bold text-[#D97757] hover:underline"
                      >
                        View →
                      </Link>
                      <button
                        type="button"
                        onClick={() => deleteSession(s.id)}
                        disabled={deletingSessionId === s.id}
                        className="text-[11px] text-[#9A9A98] hover:text-[#A82828] transition-colors disabled:cursor-not-allowed"
                        style={{ background: "none", border: "none", fontFamily: "inherit", cursor: "pointer" }}
                      >
                        {deletingSessionId === s.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
