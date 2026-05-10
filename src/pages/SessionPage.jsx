import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppNav } from "../components/AppNav";
import { apiFetch } from "../lib/utils";

const TYPE_STYLE = {
  category:  { background: "#EBF2FF", color: "#2D5FA8", border: "1px solid #C0D5F5" },
  technique: { background: "#F2EDFF", color: "#5B3FA8", border: "1px solid #D0C0F5" },
  variant:   { background: "#FFF8EB", color: "#A86B1A", border: "1px solid #F0D9A0" },
};

const DIFFICULTY_STYLE = {
  foundational: { background: "#EDFBF3", color: "#1A7A48", border: "1px solid #B6EDD0" },
  intermediate: { background: "#FFF8EB", color: "#A86B1A", border: "1px solid #F0D9A0" },
  advanced:     { background: "#FFF0F0", color: "#A82828", border: "1px solid #F0C0C0" },
};

const STATUS_STYLE = {
  queued:      { background: "#F5F4F1", color: "#6B6B6B", border: "1px solid #E0DDD3" },
  in_progress: { background: "#EBF5FF", color: "#1D6FA4", border: "1px solid #BDDCF5" },
  completed:   { background: "#EDFBF3", color: "#1A7A48", border: "1px solid #B6EDD0" },
  active:      { background: "#EBF5FF", color: "#1D6FA4", border: "1px solid #BDDCF5" },
  abandoned:   { background: "#F5F4F1", color: "#6B6B6B", border: "1px solid #E0DDD3" },
};

const orderedTypes = ["category", "technique", "variant"];

function Badge({ style: styleName, text, lookup }) {
  const s = lookup[styleName] || lookup[Object.keys(lookup)[0]];
  return (
    <span
      style={{
        ...s,
        display: "inline-flex",
        borderRadius: 999,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.02em",
        textTransform: "capitalize",
      }}
    >
      {text}
    </span>
  );
}

export function SessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [session, setSession] = useState(null);
  const [plan, setPlan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [meResp, sessionResp, planResp] = await Promise.all([
          apiFetch("/api/user/auth/me"),
          apiFetch(`/api/user/sessions/${sessionId}`),
          apiFetch(`/api/user/sessions/${sessionId}/plan`, { method: "POST" }),
        ]);
        const [meData, sessionData, planData] = await Promise.all([
          meResp ? meResp.json() : null,
          sessionResp ? sessionResp.json() : null,
          planResp ? planResp.json() : null,
        ]);
        setEmail(meData?.email || "");
        setSession(sessionData);
        setPlan(planData?.plan || []);
      } catch {
        setError("Unable to load this session.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  const groupedPlan = useMemo(() => {
    const groups = { category: [], technique: [], variant: [] };
    for (const item of plan) {
      if (groups[item.skill_type]) groups[item.skill_type].push(item);
    }
    return groups;
  }, [plan]);

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

  async function handleAbandon() {
    setAbandoning(true);
    try {
      const resp = await apiFetch(`/api/user/sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "abandoned" }),
      });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error || "Unable to update session."); return; }
      navigate("/dashboard", { replace: true });
    } catch {
      setError("Unable to update session.");
    } finally {
      setAbandoning(false);
    }
  }

  async function handleResume() {
    setResuming(true);
    try {
      const resp = await apiFetch(`/api/user/sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "active" }),
      });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error || "Unable to update session."); return; }
      setSession((prev) => prev ? { ...prev, status: data.status } : prev);
    } catch {
      setError("Unable to update session.");
    } finally {
      setResuming(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this session? This will remove the study plan and session history.")) return;
    setDeleting(true);
    try {
      const resp = await apiFetch(`/api/user/sessions/${sessionId}`, { method: "DELETE" });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error || "Unable to delete session."); return; }
      navigate("/dashboard?from=session", { replace: true });
    } catch {
      setError("Unable to delete session.");
    } finally {
      setDeleting(false);
    }
  }

  const isActive = session?.status === "active";

  return (
    <div style={{ minHeight: "100vh" }}>
      <AppNav email={email} onLogout={handleLogout} loggingOut={loggingOut} />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 40px 80px" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh" }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "2px solid #E0DDD3",
                borderTopColor: "#1A1A1A",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : error ? (
          <p style={{ fontSize: 13, color: "#C0392B" }}>{error}</p>
        ) : session ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
            {/* Page header */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
              <div>
                <Link
                  to="/dashboard?from=session"
                  style={{ fontSize: 13, color: "#9A9A98", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#1A1A1A")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#9A9A98")}
                >
                  ← Dashboard
                </Link>
                <h1
                  style={{
                    marginTop: 16,
                    fontSize: "clamp(28px, 4vw, 44px)",
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                    color: "#1A1A1A",
                    fontFamily: "Martel Sans, sans-serif",
                    lineHeight: 1.0,
                  }}
                >
                  {session.company_name}
                </h1>
                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                  {session.timeline_weeks && (
                    <span style={{ fontSize: 13, color: "#6B6B6B" }}>
                      {session.timeline_weeks} weeks
                    </span>
                  )}
                  <span
                    style={{
                      display: "inline-flex",
                      borderRadius: 999,
                      padding: "3px 10px",
                      fontSize: 11,
                      fontWeight: 500,
                      textTransform: "capitalize",
                      ...(STATUS_STYLE[session.status] || STATUS_STYLE.queued),
                    }}
                  >
                    {session.status}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={isActive ? handleAbandon : handleResume}
                  disabled={abandoning || resuming || deleting}
                  style={{
                    background: "none",
                    border: "1px solid #E0DDD3",
                    borderRadius: 999,
                    padding: "8px 18px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#1A1A1A",
                    cursor: (abandoning || resuming || deleting) ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    opacity: (abandoning || resuming || deleting) ? 0.5 : 1,
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!abandoning && !resuming) e.currentTarget.style.borderColor = "#9A9A98"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E0DDD3"; }}
                >
                  {isActive
                    ? (abandoning ? "Abandoning…" : "Abandon session")
                    : (resuming ? "Resuming…" : "Resume session")}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    background: "none",
                    border: "1px solid #F0C0C0",
                    borderRadius: 999,
                    padding: "8px 18px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#A82828",
                    cursor: deleting ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    opacity: deleting ? 0.5 : 1,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!deleting) e.currentTarget.style.background = "#FFF0F0"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                >
                  {deleting ? "Deleting…" : "Delete session"}
                </button>
              </div>
            </div>

            {/* Skill plan */}
            {orderedTypes.map((type) =>
              groupedPlan[type].length > 0 ? (
                <section key={type} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        ...(TYPE_STYLE[type] || TYPE_STYLE.category),
                        display: "inline-flex",
                        borderRadius: 999,
                        padding: "3px 12px",
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {type}
                    </span>
                    <span style={{ fontSize: 12, color: "#9A9A98" }}>
                      {groupedPlan[type].length} {groupedPlan[type].length === 1 ? "skill" : "skills"}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {groupedPlan[type].map((item) => (
                      <article
                        key={item.session_skill_id}
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid #E5E2D8",
                          borderRadius: 14,
                          padding: "18px 20px",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 16,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <h2
                            style={{
                              fontSize: 17,
                              fontWeight: 700,
                              letterSpacing: "-0.02em",
                              color: "#1A1A1A",
                              margin: 0,
                              fontFamily: "Martel Sans, sans-serif",
                            }}
                          >
                            {item.skill_name}
                          </h2>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {item.difficulty && (
                              <Badge style={item.difficulty} text={item.difficulty} lookup={DIFFICULTY_STYLE} />
                            )}
                            <span
                              style={{
                                background: "#F5F4F1",
                                color: "#6B6B6B",
                                border: "1px solid #E0DDD3",
                                display: "inline-flex",
                                borderRadius: 999,
                                padding: "3px 10px",
                                fontSize: 11,
                                fontWeight: 500,
                              }}
                            >
                              asked {item.count} {item.count === 1 ? "time" : "times"}
                            </span>
                          </div>
                        </div>
                        <Badge style={item.status} text={item.status.replace("_", " ")} lookup={STATUS_STYLE} />
                      </article>
                    ))}
                  </div>
                </section>
              ) : null,
            )}

            {plan.length === 0 && (
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E2D8",
                  borderRadius: 14,
                  padding: "28px 24px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                }}
              >
                <p style={{ fontSize: 14, color: "#6B6B6B", margin: 0 }}>
                  No published skills are available for this company yet.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
