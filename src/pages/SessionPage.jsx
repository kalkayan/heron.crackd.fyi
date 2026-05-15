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
  suggested:   { background: "#FBF1ED", color: "#D97757", border: "1px solid #F0D6C7" },
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
  const done = priority === "done";
  const dotColor = done ? "#1A7A48" : priority === "high" ? "#D97757" : "#C8C5BB";

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <span style={{
        width: 18, height: 18, borderRadius: "50%",
        border: `1.5px solid ${dotColor}`,
        background: done ? "#1A7A48" : "transparent",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, marginTop: 1,
      }}>
        {done
          ? <span style={{ fontSize: 9, color: "#FFFFFF", fontWeight: 800 }}>✓</span>
          : <span style={{ width: current ? 8 : 6, height: current ? 8 : 6, borderRadius: "50%", background: dotColor }} />
        }
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: current ? 700 : 500,
          color: done ? "#9A9A98" : "#1A1A1A",
          letterSpacing: "-0.01em",
          textDecoration: done ? "line-through" : "none",
        }}>
          {name}
          {current && (
            <span style={{ marginLeft: 8, fontSize: 10, color: "#D97757", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              now
            </span>
          )}
        </div>
        {!done && detail && <div style={{ fontSize: 11.5, color: "#9A9A98", marginTop: 3 }}>{detail}</div>}
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

function SkillProgressCard({ mastered, total, company, categories }) {
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
  const remaining = total - mastered;
  return (
    <div style={RAIL_CARD}>
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        Topic progress
        <span style={{ fontSize: 11, color: "#9A9A98", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
      </div>
      <div style={{ fontSize: 11.5, color: "#6B6B6B", marginTop: 6, lineHeight: 1.45 }}>
        {mastered} of {total} {company} topics mastered
      </div>
      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 3 }}>
        {[...categories].sort((a, b) => (b.mastered ? 1 : 0) - (a.mastered ? 1 : 0)).map((cat, i) => (
          <span key={i} title={cat.skill_name} style={{
            flex: 1, height: 22, borderRadius: 4,
            background: cat.mastered ? "#D97757" : "#E8E5DA",
            border: cat.mastered ? "0" : "1px dashed #C8C5BB",
          }} />
        ))}
      </div>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10.5, color: "#9A9A98" }}>
        <span>{mastered} done</span>
        <span>{remaining} to go</span>
      </div>
    </div>
  );
}

function TodayCard({ items }) {
  return (
    <div style={RAIL_CARD}>
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" }}>Today</div>
      <div style={{ fontSize: 11.5, color: "#6B6B6B", marginTop: 6, lineHeight: 1.45 }}>What you've done · what's next</div>
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

const CONFIDENCE_DOT = {
  high:   "#1A7A48",
  medium: "#C8893A",
  low:    "#A82828",
};

function CapabilitiesCard({ capabilities }) {
  const [open, setOpen] = useState(false);
  const assessed = capabilities.filter(s => s.confidence);
  if (assessed.length === 0) return null;

  const high   = assessed.filter(s => s.confidence === "high").length;
  const medium = assessed.filter(s => s.confidence === "medium").length;
  const low    = assessed.filter(s => s.confidence === "low").length;

  return (
    <div style={RAIL_CARD}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" }}>Capabilities</div>
          <div style={{ fontSize: 11.5, color: "#6B6B6B", marginTop: 4 }}>
            {high} solid · {medium} partial · {low} gap
          </div>
        </div>
        <span style={{
          fontSize: 18, color: "#D8D6CE",
          transform: open ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
          lineHeight: 1,
        }}>›</span>
      </div>

      {open && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
          {assessed.map(s => (
            <div key={s.skill_id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                background: CONFIDENCE_DOT[s.confidence] || "#D8D6CE",
              }} />
              <span style={{ flex: 1, fontSize: 12.5, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.skill_name}
              </span>
              <span style={{ fontSize: 11, color: "#9A9A98", textTransform: "capitalize", flexShrink: 0 }}>
                {s.confidence}
              </span>
            </div>
          ))}
        </div>
      )}
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




// ---------------------------------------------------------------------------
// Plan timeline — minimal vertical path
// ---------------------------------------------------------------------------

function PlanTimeline({ plan, sessionId, generating }) {
  const categories = plan
    .filter(s => s.skill_type === "category")
    .sort((a, b) => (a.sequence_pos ?? 0) - (b.sequence_pos ?? 0));

  const allTechniques = plan.filter(s => s.skill_type === "technique");

  const techniquesByParent = {};
  const orphanTechniques = [];
  for (const t of allTechniques) {
    if (t.parent_skill_id) {
      if (!techniquesByParent[t.parent_skill_id]) techniquesByParent[t.parent_skill_id] = [];
      techniquesByParent[t.parent_skill_id].push(t);
    } else {
      orphanTechniques.push(t);
    }
  }
  for (const key of Object.keys(techniquesByParent)) {
    techniquesByParent[key].sort((a, b) => (a.sequence_pos ?? 0) - (b.sequence_pos ?? 0));
  }
  orphanTechniques.sort((a, b) => (a.sequence_pos ?? 0) - (b.sequence_pos ?? 0));

  // Cap unmastered techniques at 5 — completed ones always shown
  let unmasteredBudget = 5;
  const rows = [];
  for (const cat of categories) {
    const catTechs = (techniquesByParent[cat.skill_id] || []).filter(t => {
      if (t.status === "completed") return true;
      if (unmasteredBudget > 0) { unmasteredBudget--; return true; }
      return false;
    });
    if (catTechs.length > 0) {
      rows.push({ ...cat, _row: "category" });
      for (const t of catTechs) rows.push({ ...t, _row: "technique" });
    }
  }
  for (const t of orphanTechniques) {
    if (t.status === "completed") { rows.push({ ...t, _row: "technique" }); continue; }
    if (unmasteredBudget > 0) { unmasteredBudget--; rows.push({ ...t, _row: "technique" }); }
  }

  const catHasRelevant = {};
  for (const s of plan) {
    if (s.company_relevant) {
      if (s.skill_type === "category") catHasRelevant[s.skill_id] = true;
      else if (s.skill_type === "technique" && s.parent_skill_id) catHasRelevant[s.parent_skill_id] = true;
    }
  }

  const LINE = "#E5E2D8";
  const RAIL = 20;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {rows.map((item, idx) => {
        const isFirst = idx === 0;
        const isLast  = idx === rows.length - 1;

        if (item._row === "category") {
          const relevant = !!catHasRelevant[item.skill_id];
          return (
            <div key={item.skill_id}>
              {/* connecting line above (skip for very first item) */}
              {!isFirst && (
                <div style={{ display: "flex" }}>
                  <div style={{ width: RAIL, display: "flex", justifyContent: "center" }}>
                    <div style={{ width: 1.5, height: 22, background: LINE }} />
                  </div>
                </div>
              )}

              {/* category label — no dot, just text */}
              <div style={{ display: "flex", alignItems: "center", gap: 9, paddingLeft: 2 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: relevant ? "#1A1A1A" : "#6B6B6B",
                }}>
                  {item.skill_name}
                </span>
                {relevant && (
                  <span style={{
                    fontSize: 9.5, fontWeight: 600, letterSpacing: "0.05em",
                    textTransform: "uppercase", color: "#8B6B55",
                    background: "#F0EAE4", border: "1px solid #DDD0C6",
                    borderRadius: 999, padding: "1px 7px", flexShrink: 0,
                  }}>
                    company asks
                  </span>
                )}
              </div>

              {/* short line below label, before first technique */}
              <div style={{ display: "flex" }}>
                <div style={{ width: RAIL, display: "flex", justifyContent: "center" }}>
                  <div style={{ width: 1.5, height: 10, background: LINE }} />
                </div>
              </div>
            </div>
          );
        }

        /* ── Technique node ── */
        const dotBorder =
          item.status === "completed"   ? "#1A7A48" :
          item.status === "in_progress" ? "#1D6FA4" :
          item.company_relevant         ? "#9A9A98" : "#C8C5BB";
        const dotBg =
          item.status === "completed"   ? "#1A7A48" :
          item.status === "in_progress" ? "#1D6FA4" : "#FFFFFF";
        const textColor =
          item.status === "completed"   ? "#1A7A48" :
          item.status === "in_progress" ? "#1D6FA4" : "#1A1A1A";

        return (
          <div key={item.session_skill_id}>
            <Link
              to={`/session/${sessionId}/skills/${item.session_skill_id}`}
              style={{ textDecoration: "none", display: "flex", alignItems: "center" }}
              onMouseEnter={e => e.currentTarget.querySelector(".tl").style.color = "#D97757"}
              onMouseLeave={e => e.currentTarget.querySelector(".tl").style.color = textColor}
            >
              {/* dot on the rail */}
              <div style={{ width: RAIL, display: "flex", justifyContent: "center", flexShrink: 0 }}>
                <div style={{
                  width: 9, height: 9, borderRadius: "50%",
                  border: `1.5px solid ${dotBorder}`,
                  background: dotBg,
                }} />
              </div>

              {/* label */}
              <span className="tl" style={{
                fontSize: 14, fontWeight: item.company_relevant ? 500 : 400,
                color: textColor, paddingLeft: 10,
                transition: "color 0.12s", letterSpacing: "-0.01em",
              }}>
                {item.skill_name}
              </span>

              {item.status === "completed" && (
                <span style={{ marginLeft: 8, fontSize: 11, color: "#1A7A48", fontWeight: 700 }}>✓</span>
              )}
              {item.status === "in_progress" && (
                <span style={{ marginLeft: 8, fontSize: 10, color: "#1D6FA4", fontWeight: 600 }}>in progress</span>
              )}
            </Link>

            {/* connecting line below (skip after last) */}
            {!isLast && (
              <div style={{ display: "flex" }}>
                <div style={{ width: RAIL, display: "flex", justifyContent: "center" }}>
                  <div style={{ width: 1.5, height: 16, background: LINE }} />
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Generating node — trailing entry on the timeline */}
      {generating && (
        <div>
          {rows.length > 0 && (
            <div style={{ display: "flex" }}>
              <div style={{ width: RAIL, display: "flex", justifyContent: "center" }}>
                <div style={{ width: 1.5, height: 22, background: LINE }} />
              </div>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: RAIL, display: "flex", justifyContent: "center", flexShrink: 0 }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                border: "1.5px solid #E0DDD3",
                borderTopColor: "#D97757",
                animation: "spin 0.8s linear infinite",
                flexShrink: 0,
              }} />
            </div>
            <span style={{ paddingLeft: 10, fontSize: 13, color: "#9A9A98", fontStyle: "italic" }}>
              {rows.length === 0 ? "Building your golden path…" : "finding next skills…"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}


function PlanFailedCard({ sessionId, onRetry }) {
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    try {
      const resp = await apiFetch(`/api/user/sessions/${sessionId}/plan`, { method: "POST" });
      if (resp && resp.ok) onRetry();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div style={{ background: "#FFF8F8", border: "1px solid #F0C0C0", borderRadius: 24, padding: "28px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#A82828", margin: 0 }}>Plan generation failed</p>
        <p style={{ fontSize: 12, color: "#9A9A98", margin: "4px 0 0" }}>The AI hit a rate limit. Try again — it usually clears within a minute.</p>
      </div>
      <button
        onClick={handleRetry}
        disabled={retrying}
        style={{ padding: "8px 20px", background: retrying ? "#E0DDD3" : "#1A1A1A", color: "#FFFFFF", border: "none", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: retrying ? "not-allowed" : "pointer", fontFamily: "inherit", flexShrink: 0 }}
      >
        {retrying ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}

export function SessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [session, setSession] = useState(null);
  const [plan, setPlan] = useState([]);
  const [planStatus, setPlanStatus] = useState("ready");
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
        setPlanStatus(planData?.plan_status || "ready");
        setCapabilities(capsData?.skills || []);
      } catch {
        setError("Unable to load this session.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  // Poll for plan updates while AI generation is in progress
  useEffect(() => {
    if (planStatus !== "generating") return;
    const interval = setInterval(async () => {
      try {
        const resp = await apiFetch(`/api/user/sessions/${sessionId}/plan`);
        if (!resp) return;
        const data = await resp.json();
        setPlan(data.plan || []);
        setPlanStatus(data.plan_status || "ready");
      } catch { /* ignore poll errors */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [planStatus, sessionId]);


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

  const backLink = (
    <Link
      to="/dashboard?from=session"
      style={{ fontSize: 13, color: "#9A9A98", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#1A1A1A")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#9A9A98")}
    >
      Dashboard
    </Link>
  );

  return (
    <div style={{ minHeight: "100vh" }}>
      <AppNav email={email} onLogout={handleLogout} loggingOut={loggingOut} leftAction={backLink} />

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
            <div style={{ marginTop: 24 }}>
              <span style={{ color: "#D97757", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.25em", marginBottom: 12, display: "block" }}>
                Personalized Plan
              </span>
              <h1 style={{
                fontSize: "clamp(32px, 5vw, 56px)",
                fontWeight: 900, letterSpacing: "-0.04em", color: "#1A1A1A",
                fontFamily: "Martel Sans, sans-serif", lineHeight: 1.05, maxWidth: 800, margin: 0,
              }}>
                A strategy built for you to master {session.company_name}
              </h1>
              <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                {session.timeline_weeks && (
                  <span style={{ fontSize: 13, color: "#6B6B6B", fontWeight: 500 }}>{session.timeline_weeks} weeks</span>
                )}
                <span style={{
                  display: "inline-flex", borderRadius: 999, padding: "3px 10px",
                  fontSize: 11, fontWeight: 600, textTransform: "capitalize",
                  ...(STATUS_STYLE[session.status] || STATUS_STYLE.queued),
                }}>
                  {session.status}
                </span>
              </div>
            </div>

            {/* Plan timeline */}
            {(plan.filter(s => s.skill_type !== "variant").length > 0 || planStatus === "generating") && (
              <PlanTimeline plan={plan} sessionId={sessionId} generating={planStatus === "generating"} />
            )}

            {/* Failed state */}
            {planStatus === "failed" && <PlanFailedCard sessionId={sessionId} onRetry={() => setPlanStatus("generating")} />}

            {/* Empty state — no skills yet and not generating */}
            {planStatus === "ready" && plan.filter(s => s.skill_type !== "variant").length === 0 && (
              <div style={{ padding: "40px 0" }}>
                <p style={{ fontSize: 14, color: "#9A9A98", margin: 0 }}>No skills in this plan yet.</p>
                <p style={{ fontSize: 12, color: "#C8C5BB", marginTop: 6 }}>We're mapping {session.company_name}'s patterns — check back shortly.</p>
              </div>
            )}

            </div>{/* end left col */}

            {/* Right: stats sidebar */}
            {(() => {
              // Category-level progress from the plan
              const planCategories = plan.filter(s => s.skill_type === "category");
              const planTechniques = plan.filter(s => s.skill_type === "technique");
              const techsByCategory = {};
              for (const t of planTechniques) {
                if (t.parent_skill_id) {
                  if (!techsByCategory[t.parent_skill_id]) techsByCategory[t.parent_skill_id] = [];
                  techsByCategory[t.parent_skill_id].push(t);
                }
              }
              const categoryStats = planCategories
                .map(cat => {
                  const techs = techsByCategory[cat.skill_id] || [];
                  return { ...cat, mastered: techs.length > 0 && techs.every(t => t.status === "completed"), techCount: techs.length };
                })
                .filter(c => c.techCount > 0);
              const masteredCats = categoryStats.filter(c => c.mastered).length;
              const totalCats = categoryStats.length;

              // Next unmastered technique (first in sequence order)
              const nextTech = planTechniques
                .filter(t => t.status !== "completed")
                .sort((a, b) => (a.sequence_pos ?? 0) - (b.sequence_pos ?? 0))[0];

              // Today: completed techniques (crossed off) + next 3 unmastered
              const completedTechs = planTechniques
                .filter(t => t.status === "completed")
                .sort((a, b) => (a.sequence_pos ?? 0) - (b.sequence_pos ?? 0));
              const unmasteredTechs = planTechniques
                .filter(t => t.status !== "completed")
                .sort((a, b) => (a.sequence_pos ?? 0) - (b.sequence_pos ?? 0))
                .slice(0, 3);
              const todayItems = [
                ...completedTechs.map(t => ({ name: t.skill_name, detail: "", priority: "done", current: false })),
                ...unmasteredTechs.map((t, i) => ({
                  name: t.skill_name,
                  detail: t.difficulty || "",
                  priority: t.company_relevant ? "high" : "med",
                  current: i === 0,
                })),
              ];

              // Claude card text: use AI's suggestion_reason for the next skill
              const claudeText = nextTech
                ? (nextTech.suggestion_reason || `Focus on ${nextTech.skill_name} next — it's your most direct path through ${session.company_name}'s interview loop.`)
                : null;

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "sticky", top: 72 }}>
                  <CompanyLinkCard companyName={session.company_name} companyId={session.company_id} />
                  {claudeText && <FromClaudeCard text={claudeText} />}
                  {totalCats > 0 && <SkillProgressCard mastered={masteredCats} total={totalCats} company={session.company_name} categories={categoryStats} />}
                  {todayItems.length > 0 && <TodayCard items={todayItems} />}
                  <CapabilitiesCard capabilities={capabilities} />

                  {/* Session actions at the bottom */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 6 }}>
                    <button
                      type="button"
                      onClick={isActive ? handleAbandon : handleResume}
                      disabled={abandoning || resuming || deleting}
                      style={{
                        background: "none", border: "1px solid #E0DDD3", borderRadius: 999,
                        padding: "8px 18px", fontSize: 13, fontWeight: 500, color: "#6B6B6B",
                        cursor: (abandoning || resuming || deleting) ? "not-allowed" : "pointer",
                        fontFamily: "inherit", opacity: (abandoning || resuming || deleting) ? 0.5 : 1,
                        transition: "border-color 0.15s, color 0.15s", width: "100%",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#9A9A98"; e.currentTarget.style.color = "#1A1A1A"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#E0DDD3"; e.currentTarget.style.color = "#6B6B6B"; }}
                    >
                      {isActive ? (abandoning ? "Abandoning…" : "Abandon session") : (resuming ? "Resuming…" : "Resume session")}
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      style={{
                        background: "none", border: "none", borderRadius: 999,
                        padding: "6px 18px", fontSize: 12, fontWeight: 500, color: "#C8A8A0",
                        cursor: deleting ? "not-allowed" : "pointer",
                        fontFamily: "inherit", opacity: deleting ? 0.5 : 1,
                        transition: "color 0.15s", width: "100%",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#A82828"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "#C8A8A0"; }}
                    >
                      {deleting ? "Deleting…" : "Delete session"}
                    </button>
                  </div>
                </div>
              );
            })()}

          </div>
        ) : null}
      </main>
    </div>
  );
}

