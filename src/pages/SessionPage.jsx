import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
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

/** Map API confidence → bar state for SkillProgressCard */
function confidenceToState(confidence) {
  if (confidence === "high")   return "high";
  if (confidence === "medium") return "some";
  return "low"; // "low" or null (not yet assessed)
}

/** Derive "Today" items from skills with gaps (no or low confidence). */
function todayFromSkills(skills) {
  const gaps = skills.filter(s => s.confidence !== "high");
  return gaps.slice(0, 4).map((s, i) => ({
    name:     s.skill_name,
    detail:   s.difficulty || s.skill_type || "",
    priority: s.confidence === "medium" ? "med" : "high",
    current:  i === 0,
  }));
}

const RAIL_CARD = {
  background: "#F6F4ED",
  border: "1px solid #E5E2D8",
  borderRadius: 24,
  padding: "24px 24px",
};

function RailSkill({ name, detail, priority, current }) {
  const dotColor = priority === "high" ? "#D97757" : priority === "med" ? "#C8893A" : "#9A9A98";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <span style={{
        width: 18, height: 18, borderRadius: "50%",
        border: `1.5px solid ${current ? "#D97757" : dotColor}`,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, marginTop: 1,
      }}>
        <span style={{
          width: current ? 8 : 6, height: current ? 8 : 6,
          borderRadius: "50%",
          background: current ? "#D97757" : dotColor,
        }} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: current ? 700 : 600, color: "#1A1A1A", letterSpacing: "-0.01em" }}>
          {name}
          {current && (
            <span style={{ marginLeft: 8, fontSize: 10, color: "#D97757", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              now
            </span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: "#9A9A98", marginTop: 3 }}>{detail}</div>
      </div>
    </div>
  );
}


function RailRow({ label, value, dot }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 12.5, color: "#1A1A1A" }}>{label}</span>
      <span style={{ fontSize: 12, color: "#6B6B6B", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

function SkillProgressCard({ skills, company = "Stripe" }) {
  const high = skills.filter(s => s.state === "high").length;
  const some = skills.filter(s => s.state === "some").length;
  const low  = skills.filter(s => s.state === "low").length;
  const pct  = Math.round((high + some * 0.5) / skills.length * 100);
  return (
    <div style={RAIL_CARD}>
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        Skill progress
        <span style={{ fontSize: 11, color: "#9A9A98", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
      </div>
      <div style={{ fontSize: 11.5, color: "#6B6B6B", marginTop: 6, lineHeight: 1.45 }}>
        {high} of {skills.length} {company} skills solid
      </div>
      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 4 }}>
        {skills.map((s, i) => (
          <span key={i} title={s.name} style={{
            flex: 1,
            height: 22,
            borderRadius: 4,
            background: s.state === "high" ? "#D97757" : s.state === "some" ? "#F0D6C7" : "#E8E5DA",
            border: s.state === "low" ? "1px dashed #C8C5BB" : "0",
          }} />
        ))}
      </div>
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10.5, color: "#9A9A98" }}>
        <span>{high} solid</span>
        <span>{some} partial</span>
        <span>{low} gap</span>
      </div>
    </div>
  );
}

function TodayCard({ items }) {
  return (
    <div style={RAIL_CARD}>
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" }}>Today</div>
      <div style={{ fontSize: 11.5, color: "#6B6B6B", marginTop: 6, lineHeight: 1.45 }}>Skills to practice now</div>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item) => (
          <RailSkill key={item.name} {...item} />
        ))}
      </div>
    </div>
  );
}

function CoverageCard({ pct = 0, company = "Stripe" }) {
  return (
    <div style={RAIL_CARD}>
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" }}>Coverage</div>
      <div style={{ fontSize: 11.5, color: "#6B6B6B", marginTop: 6, lineHeight: 1.45 }}>
        How much of {company}'s loop you can confidently handle
      </div>
      <div style={{ marginTop: 18, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em", color: "#1A1A1A" }}>
          {pct}<span style={{ fontSize: 22, color: "#9A9A98", fontWeight: 500 }}>%</span>
        </span>
      </div>
      <div style={{ marginTop: 14, height: 6, background: "#E8E5DA", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#1A1A1A", borderRadius: 999 }} />
      </div>
    </div>
  );
}

function FromClaudeCard({ text }) {
  return (
    <div style={{ ...RAIL_CARD, background: "#FBF1ED", borderColor: "#F0D6C7" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#D97757", flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#D97757", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          From Claude
        </span>
      </div>
      <div style={{ marginTop: 10, fontSize: 13, color: "#3D2820", lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

function CompanyLinkCard({ companyName, companyId }) {
  if (!companyId) return null;
  return (
    <Link to={`/companies/${companyId}`} style={{ textDecoration: "none" }}>
      <div 
        style={{
          ...RAIL_CARD,
          background: "#D97757",
          color: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          transition: "all 0.2s ease-in-out",
          cursor: "pointer",
          border: "none",
          padding: "20px 24px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#E0886A";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(217,119,87,0.15)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#D97757";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>View {companyName} interview brief</span>
          <span style={{ fontSize: 18 }}>→</span>
        </div>
      </div>
    </Link>
  );
}



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
  const [capabilities, setCapabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [meResp, sessionResp, planResp, capsResp] = await Promise.all([
          apiFetch("/api/user/auth/me"),
          apiFetch(`/api/user/sessions/${sessionId}`),
          apiFetch(`/api/user/sessions/${sessionId}/plan`),
          apiFetch(`/api/user/sessions/${sessionId}/capabilities`),
        ]);
        const [meData, sessionData, planData, capsData] = await Promise.all([
          meResp ? meResp.json() : null,
          sessionResp ? sessionResp.json() : null,
          planResp ? planResp.json() : null,
          capsResp ? capsResp.json() : null,
        ]);
        setEmail(meData?.email || "");
        setSession(sessionData);
        setPlan(planData?.plan || []);
        setCapabilities(capsData?.skills || []);
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

      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "40px 40px 80px" }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32, alignItems: "start" }}>

            {/* Left: header + skill plan */}
            <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
            {/* Page header */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
              <div style={{ flex: 1 }}>
                <Link
                  to="/dashboard?from=session"
                  style={{ fontSize: 13, color: "#9A9A98", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#1A1A1A")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#9A9A98")}
                >
                  ← Dashboard
                </Link>
                <div style={{ marginTop: 24 }}>
                  <span style={{ color: "#D97757", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.25em", marginBottom: 12, display: "block" }}>
                    Personalized Plan
                  </span>
                  <h1
                    style={{
                      fontSize: "clamp(32px, 5vw, 56px)",
                      fontWeight: 900,
                      letterSpacing: "-0.04em",
                      color: "#1A1A1A",
                      fontFamily: "Martel Sans, sans-serif",
                      lineHeight: 1.05,
                      maxWidth: 800,
                    }}
                  >
                    A strategy built for you to master {session.company_name}
                  </h1>
                </div>

                <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                  {session.timeline_weeks && (
                    <span style={{ fontSize: 13, color: "#6B6B6B", fontWeight: 500 }}>
                      {session.timeline_weeks} weeks
                    </span>
                  )}
                  <span
                    style={{
                      display: "inline-flex",
                      borderRadius: 999,
                      padding: "3px 10px",
                      fontSize: 11,
                      fontWeight: 600,
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
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
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

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {groupedPlan[type].map((item) => (
                        <Link
                          key={item.session_skill_id}
                          to={`/session/${sessionId}/skills/${item.session_skill_id}`}
                          style={{ textDecoration: "none" }}
                        >
                        <article
                          style={{
                            background: "#FFFFFF",
                            border: "1px solid #E5E2D8",
                            borderRadius: 24,
                            padding: "24px 28px",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 16,
                            flexWrap: "wrap",
                            cursor: "pointer",
                            transition: "all 0.2s ease-in-out",
                          }}
                          onMouseEnter={e => { 
                            e.currentTarget.style.borderColor = "#C8C5BB"; 
                            e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.04)";
                            e.currentTarget.style.transform = "translateY(-1px)";
                          }}
                          onMouseLeave={e => { 
                            e.currentTarget.style.borderColor = "#E5E2D8"; 
                            e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.02)";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <h2
                              style={{
                                fontSize: 18,
                                fontWeight: 800,
                                letterSpacing: "-0.02em",
                                color: "#1A1A1A",
                                margin: 0,
                                fontFamily: "Martel Sans, sans-serif",
                              }}
                            >
                              {item.skill_name}
                            </h2>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {item.difficulty && (
                                <Badge style={item.difficulty} text={item.difficulty} lookup={DIFFICULTY_STYLE} />
                              )}
                              {item.count > 0 && (
                                <span
                                  style={{
                                    background: "#F5F4F1",
                                    color: "#6B6B6B",
                                    border: "1px solid #E0DDD3",
                                    display: "inline-flex",
                                    borderRadius: 999,
                                    padding: "3px 12px",
                                    fontSize: 11,
                                    fontWeight: 600,
                                  }}
                                >
                                  {item.count} appearances
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <Badge style={item.status} text={item.status.replace("_", " ")} lookup={STATUS_STYLE} />
                            <span style={{ fontSize: 20, color: "#D8D6CE", fontWeight: 300 }}>›</span>
                          </div>
                        </article>
                        </Link>
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

            </div>{/* end left col */}

            {/* Right: stats sidebar */}
            {(() => {
              const skillBars = capabilities.map(s => ({ name: s.skill_name, state: confidenceToState(s.confidence) }));
              const todayItems = todayFromSkills(capabilities);
              const highCount = skillBars.filter(s => s.state === "high").length;
              const capPct = skillBars.length ? Math.round((highCount / skillBars.length) * 100) : 0;
              const firstGap = capabilities.find(s => s.confidence !== "high");
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "sticky", top: 72 }}>
                  <CompanyLinkCard companyName={session.company_name} companyId={session.company_id} />
                  {skillBars.length > 0 && (
                    <SkillProgressCard skills={skillBars} company={session.company_name} />
                  )}
                  {todayItems.length > 0 && (
                    <TodayCard items={todayItems} />
                  )}
                  <CoverageCard pct={capPct} company={session.company_name} />
                  {firstGap && (
                    <FromClaudeCard text={`Focus on ${firstGap.skill_name} first — it's your biggest gap for ${session.company_name}.`} />
                  )}
                </div>
              );
            })()}

          </div>
        ) : null}
      </main>
    </div>
  );
}
