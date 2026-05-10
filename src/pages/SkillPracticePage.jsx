import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppNav } from "../components/AppNav";
import { apiFetch } from "../lib/utils";

const DIFFICULTY_STYLE = {
  easy:         { background: "#EDFBF3", color: "#1A7A48", border: "1px solid #B6EDD0" },
  medium:       { background: "#FFF8EB", color: "#A86B1A", border: "1px solid #F0D9A0" },
  hard:         { background: "#FFF0F0", color: "#A82828", border: "1px solid #F0C0C0" },
  foundational: { background: "#EDFBF3", color: "#1A7A48", border: "1px solid #B6EDD0" },
  intermediate: { background: "#FFF8EB", color: "#A86B1A", border: "1px solid #F0D9A0" },
  advanced:     { background: "#FFF0F0", color: "#A82828", border: "1px solid #F0C0C0" },
};

const OUTCOME_STYLE = {
  solved:  { background: "#EDFBF3", color: "#1A7A48", border: "1px solid #B6EDD0" },
  partial: { background: "#FFF8EB", color: "#A86B1A", border: "1px solid #F0D9A0" },
  failed:  { background: "#FFF0F0", color: "#A82828", border: "1px solid #F0C0C0" },
};

function Badge({ text, style }) {
  return (
    <span style={{
      ...style,
      display: "inline-flex",
      borderRadius: 999,
      padding: "3px 10px",
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: "0.02em",
      textTransform: "capitalize",
    }}>
      {text}
    </span>
  );
}

export function SkillPracticePage() {
  const { sessionId, sessionSkillId } = useParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [skillData, setSkillData] = useState(null);   // { session_skill, questions }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [submitting, setSubmitting] = useState(null);  // session_question_id being submitted
  const [completed, setCompleted] = useState(false);   // skill just got marked completed

  useEffect(() => {
    async function load() {
      try {
        const [meResp, skillResp] = await Promise.all([
          apiFetch("/api/user/auth/me"),
          apiFetch(`/api/user/sessions/${sessionId}/skills/${sessionSkillId}`),
        ]);
        const [meData, skillJson] = await Promise.all([
          meResp ? meResp.json() : null,
          skillResp ? skillResp.json() : null,
        ]);
        setEmail(meData?.email || "");
        setSkillData(skillJson);
      } catch {
        setError("Unable to load this skill.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId, sessionSkillId]);

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

  async function handleSubmit(sessionQuestionId, outcome) {
    setSubmitting(sessionQuestionId);
    try {
      const resp = await apiFetch(
        `/api/user/sessions/${sessionId}/skills/${sessionSkillId}/questions/${sessionQuestionId}/submit`,
        { method: "POST", body: JSON.stringify({ outcome }) }
      );
      const data = await resp.json();
      if (!resp.ok) { setError(data.error || "Submission failed."); return; }

      // Update local question status
      setSkillData(prev => {
        if (!prev) return prev;
        const updatedQuestions = prev.questions.map(q =>
          q.session_question_id === sessionQuestionId
            ? { ...q, status: outcome === "solved" ? "solved" : "in_progress", last_outcome: outcome }
            : q
        );
        return { ...prev, questions: updatedQuestions };
      });

      if (data.skill_completed) {
        setCompleted(true);
        setSkillData(prev => prev ? { ...prev, session_skill: { ...prev.session_skill, status: "completed" } } : prev);
      }
    } catch {
      setError("Submission failed.");
    } finally {
      setSubmitting(null);
    }
  }

  const skill = skillData?.session_skill;
  const questions = skillData?.questions || [];
  const solvedCount = questions.filter(q => q.status === "solved").length;

  return (
    <div style={{ minHeight: "100vh" }}>
      <AppNav email={email} onLogout={handleLogout} loggingOut={loggingOut} />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 40px 80px" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              border: "2px solid #E0DDD3", borderTopColor: "#1A1A1A",
              animation: "spin 0.8s linear infinite",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : error ? (
          <p style={{ fontSize: 13, color: "#C0392B" }}>{error}</p>
        ) : skill ? (
          <>
            {/* Page header */}
            <div style={{ marginBottom: 36 }}>
              <Link
                to={`/session/${sessionId}`}
                style={{ fontSize: 13, color: "#9A9A98", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                onMouseEnter={e => e.currentTarget.style.color = "#1A1A1A"}
                onMouseLeave={e => e.currentTarget.style.color = "#9A9A98"}
              >
                ← Back to session
              </Link>
              <div style={{ marginTop: 16, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h1 style={{
                    fontSize: "clamp(24px, 3.5vw, 38px)",
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                    color: "#1A1A1A",
                    fontFamily: "Martel Sans, sans-serif",
                    lineHeight: 1.05,
                    margin: 0,
                  }}>
                    {skill.skill_name}
                  </h1>
                  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                    {skill.difficulty && (
                      <Badge text={skill.difficulty} style={DIFFICULTY_STYLE[skill.difficulty] || {}} />
                    )}
                    {skill.skill_type && (
                      <span style={{ fontSize: 12, color: "#9A9A98", textTransform: "capitalize" }}>{skill.skill_type}</span>
                    )}
                    {skill.status === "completed" && (
                      <Badge text="completed" style={{ background: "#EDFBF3", color: "#1A7A48", border: "1px solid #B6EDD0" }} />
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "#6B6B6B", marginTop: 4 }}>
                  {solvedCount} / {questions.length} solved
                </div>
              </div>
            </div>

            {/* Skill completed banner */}
            {completed && (
              <div style={{
                marginBottom: 28,
                background: "#EDFBF3",
                border: "1px solid #B6EDD0",
                borderRadius: 14,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}>
                <span style={{ fontSize: 20 }}>🎉</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1A7A48" }}>Skill mastered!</div>
                  <div style={{ fontSize: 13, color: "#2E9E62", marginTop: 2 }}>
                    {skill.skill_name} has been added to your capabilities.
                  </div>
                </div>
              </div>
            )}

            {/* Two-column layout */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>

              {/* Left: question list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: "#6B6B6B", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                  Questions
                </h2>

                {questions.length === 0 ? (
                  <div style={{
                    background: "#FFFFFF",
                    border: "1px solid #E5E2D8",
                    borderRadius: 14,
                    padding: "24px 20px",
                  }}>
                    <p style={{ fontSize: 13, color: "#6B6B6B", margin: 0 }}>
                      No questions available for this skill yet.
                    </p>
                  </div>
                ) : (
                  questions.map(q => (
                    <div
                      key={q.session_question_id}
                      style={{
                        background: q.status === "solved" ? "#FAFDF8" : "#FFFFFF",
                        border: `1px solid ${q.status === "solved" ? "#B6EDD0" : "#E5E2D8"}`,
                        borderRadius: 14,
                        padding: "16px 18px",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 14,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", letterSpacing: "-0.01em", lineHeight: 1.3 }}>
                          {q.title}
                        </div>
                        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                          {q.difficulty && (
                            <Badge text={q.difficulty} style={DIFFICULTY_STYLE[q.difficulty] || {}} />
                          )}
                          {q.last_outcome && (
                            <Badge text={q.last_outcome} style={OUTCOME_STYLE[q.last_outcome] || {}} />
                          )}
                          {q.external_ref && (
                            <a
                              href={q.external_ref}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: 11, color: "#9A9A98", textDecoration: "none" }}
                              onMouseEnter={e => e.currentTarget.style.color = "#1A1A1A"}
                              onMouseLeave={e => e.currentTarget.style.color = "#9A9A98"}
                            >
                              ↗ LeetCode
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Submit button */}
                      {q.status !== "solved" ? (
                        <button
                          type="button"
                          disabled={submitting === q.session_question_id}
                          onClick={() => handleSubmit(q.session_question_id, "solved")}
                          style={{
                            background: "#1A1A1A",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: 999,
                            padding: "8px 16px",
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: submitting === q.session_question_id ? "not-allowed" : "pointer",
                            fontFamily: "inherit",
                            opacity: submitting === q.session_question_id ? 0.5 : 1,
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {submitting === q.session_question_id ? "Saving…" : "Mark solved"}
                        </button>
                      ) : (
                        <span style={{ fontSize: 18, flexShrink: 0 }}>✓</span>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Right: practice area (placeholder) */}
              <div style={{
                position: "sticky",
                top: 72,
                background: "#F6F4ED",
                border: "1px solid #E5E2D8",
                borderRadius: 18,
                padding: "32px 28px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 360,
                gap: 12,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 32 }}>⌨️</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A", letterSpacing: "-0.01em" }}>
                  Practice area
                </div>
                <div style={{ fontSize: 13, color: "#9A9A98", lineHeight: 1.5, maxWidth: 240 }}>
                  Code editor and AI feedback will appear here. Coming soon.
                </div>
              </div>

            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
