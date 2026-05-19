import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Markdown from "react-markdown";
import { AppNav } from "../components/AppNav";
import { CodeEditor } from "../components/CodeEditor";
import { CodeReviewPanel } from "../components/CodeReviewPanel";
import { ChatPanel } from "../components/ChatPanel";
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
  const [aiUsage, setAiUsage] = useState(null);
  const [skillData, setSkillData] = useState(null);   // { session_skill, questions }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [submitting, setSubmitting] = useState(null);  // session_question_id being submitted
  const [completed, setCompleted] = useState(false);   // skill just got marked completed
  const [activeQuestion, setActiveQuestion] = useState(null);  // question opened in editor
  const [reviewLoading, setReviewLoading] = useState(false);
  const [review, setReview] = useState(null);   // current CodeReview result object
  const [apiCode, setApiCode] = useState(null); // {code, language} from server for active question
  const reviewPollRef = useRef(null);

  // Cleanup poll on unmount
  useEffect(() => () => { if (reviewPollRef.current) clearInterval(reviewPollRef.current); }, []);

  // When question changes, fetch last-submitted code + any existing review from server
  useEffect(() => {
    const qid = activeQuestion?.session_question_id;
    if (!qid) return;
    setApiCode(null);
    setReview(null);
    apiFetch(`/api/user/sessions/${sessionId}/questions/${qid}/last-code`)
      .then(r => r?.json())
      .then(d => {
        if (!d?.code) return;
        setApiCode({ code: d.code, language: d.language });
        if (d.status === "done" && d.verdict) {
          setReview({
            review_id: d.review_id,
            status: d.status,
            verdict: d.verdict,
            overall: d.overall,
            inline_hints: d.inline_hints || [],
            approach_feedback: d.approach_feedback,
            positive_notes: d.positive_notes,
            reviewed_at: d.reviewed_at,
          });
        }
      })
      .catch(() => {});
  }, [activeQuestion?.session_question_id, sessionId]);

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
        setAiUsage(meData?.ai_usage || null);
        setSkillData(skillJson);
        if (skillJson?.questions?.length > 0) {
          setActiveQuestion(skillJson.questions[0]);
        }
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

  async function handleReviewRequest(code, language) {
    setReviewLoading(true);
    setReview({ status: "pending" });

    // Clear any existing poll
    if (reviewPollRef.current) clearInterval(reviewPollRef.current);

    try {
      const resp = await apiFetch(`/api/user/sessions/${sessionId}/code-review`, {
        method: "POST",
        body: JSON.stringify({
          code,
          language,
          problem_title: activeQuestion?.title || "",
          submission_id: activeQuestion?.session_question_id || "",
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(resp.status === 429 ? (data.error || "Weekly AI limit reached. Resets on Monday.") : (data.error || "Review failed."));
        setReviewLoading(false);
        setReview(null);
        return;
      }

      const reviewId = data.review_id;
      const questionAtSubmit = activeQuestion;

      // Poll every 2.5s until done or failed
      reviewPollRef.current = setInterval(async () => {
        try {
          const pr = await apiFetch(`/api/user/sessions/${sessionId}/code-review/${reviewId}`);
          const pd = await pr.json();
          if (pd.status === "done" || pd.status === "failed") {
            clearInterval(reviewPollRef.current);
            reviewPollRef.current = null;
            setReviewLoading(false);
            setReview(pd);
            if (pd.status === "done" && pd.verdict === "acceptable") {
              // Backend already marked the submission solved — refresh to pick up updated statuses
              apiFetch(`/api/user/sessions/${sessionId}/skills/${sessionSkillId}`)
                .then(r => r?.json())
                .then(d => { if (d) setSkillData(d); })
                .catch(() => {});
            }
          }
        } catch {
          clearInterval(reviewPollRef.current);
          reviewPollRef.current = null;
          setReviewLoading(false);
          setReview({ status: "failed" });
        }
      }, 2500);
    } catch {
      setError("Could not submit for review.");
      setReviewLoading(false);
      setReview(null);
    }
  }

  function handleDismissReview() {
    setReview(prev => prev ? { ...prev, inline_hints: [] } : null);
    setTimeout(() => setReview(null), 0);
    if (reviewPollRef.current) { clearInterval(reviewPollRef.current); reviewPollRef.current = null; }
    setReviewLoading(false);
  }

  const skill = skillData?.session_skill;
  const questions = skillData?.questions || [];
  const solvedCount = questions.filter(q => q.status === "solved").length;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#F4F1EA", backgroundImage: "radial-gradient(circle, #D8D6CE 1px, transparent 1px)", backgroundSize: "16px 16px" }}>
      <AppNav email={email} onLogout={handleLogout} loggingOut={loggingOut} aiUsage={aiUsage} />

      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            border: "2px solid #E0DDD3", borderTopColor: "#1A1A1A",
            animation: "spin 0.8s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div style={{ flex: 1, padding: "24px 24px" }}>
          <p style={{ fontSize: 13, color: "#C0392B" }}>{error}</p>
        </div>
      ) : skill ? (
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: "0 16px" }}>

          {/* Compact page header */}
          <div style={{ flexShrink: 0, padding: "12px 0 10px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <Link
              to={`/session/${sessionId}`}
              style={{ fontSize: 12, color: "#9A9A98", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = "#1A1A1A"}
              onMouseLeave={e => e.currentTarget.style.color = "#9A9A98"}
            >
              ← Session
            </Link>
            <div style={{ width: 1, height: 14, background: "#D8D6CE", flexShrink: 0 }} />
            <h1 style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#1A1A1A",
              fontFamily: "Martel Sans, sans-serif",
              margin: 0,
              lineHeight: 1,
            }}>
              {skill.skill_name}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {skill.difficulty && <Badge text={skill.difficulty} style={DIFFICULTY_STYLE[skill.difficulty] || {}} />}
              {skill.skill_type && <span style={{ fontSize: 11, color: "#9A9A98", textTransform: "capitalize" }}>{skill.skill_type}</span>}
              {skill.status === "completed" && <Badge text="completed" style={{ background: "#EDFBF3", color: "#1A7A48", border: "1px solid #B6EDD0" }} />}
            </div>
            <div style={{ marginLeft: "auto", fontSize: 12, color: "#6B6B6B", flexShrink: 0 }}>
              {solvedCount} / {questions.length} solved
            </div>
            {completed && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "#EDFBF3", border: "1px solid #B6EDD0", borderRadius: 999,
                padding: "4px 12px", fontSize: 12, color: "#1A7A48", fontWeight: 600,
              }}>
                🎉 Skill mastered!
              </div>
            )}
          </div>

          {/* Three-column layout filling remaining height */}
          <div style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: review ? "320px 1fr 380px" : "320px 1fr",
            gap: 10,
            paddingBottom: 12,
          }}>

            {/* Col 1: question list */}
            <div style={{ overflow: "hidden", display: "flex", flexDirection: "column", gap: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9A9A98", textTransform: "uppercase", letterSpacing: "0.1em", padding: "0 2px 8px", flexShrink: 0 }}>
                Questions · {solvedCount}/{questions.length}
              </div>
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {questions.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#9A9A98", fontStyle: "italic" }}>No questions yet.</p>
                ) : (
                  questions.map(q => {
                    const isActive = activeQuestion?.session_question_id === q.session_question_id;
                    return (
                      <div
                        key={q.session_question_id}
                        onClick={() => setActiveQuestion(q)}
                        style={{
                          background: isActive ? "#FDF6F2" : q.status === "solved" ? "#FAFDF8" : "#FFFFFF",
                          border: `1px solid ${isActive ? "#D97757" : q.status === "solved" ? "#B6EDD0" : "#E5E2D8"}`,
                          borderLeft: isActive ? "3px solid #D97757" : `1px solid ${q.status === "solved" ? "#B6EDD0" : "#E5E2D8"}`,
                          borderRadius: 10,
                          padding: "10px 11px",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#1A1A1A", lineHeight: 1.35, marginBottom: 6, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                          <span>{q.title}</span>
                          {q.external_ref && (
                            <a
                              href={q.external_ref}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ fontSize: 10, color: "#9A9A98", textDecoration: "none", flexShrink: 0, marginTop: 1, lineHeight: 1.4 }}
                              onMouseEnter={e => e.currentTarget.style.color = "#D97757"}
                              onMouseLeave={e => e.currentTarget.style.color = "#9A9A98"}
                            >
                              LC ↗
                            </a>
                          )}
                        </div>
                        {(q.text || q.title) && (
                          isActive ? (
                            <div style={{ fontSize: 11, color: "#6B6B6B", lineHeight: 1.6, marginBottom: 6 }}
                              className="question-md">
                              <Markdown>{q.text || q.title}</Markdown>
                            </div>
                          ) : (
                            <div style={{
                              fontSize: 11, color: "#6B6B6B", lineHeight: 1.55, marginBottom: 6,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}>
                              {q.text || q.title}
                            </div>
                          )
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                          {q.difficulty && <Badge text={q.difficulty} style={DIFFICULTY_STYLE[q.difficulty] || {}} />}
                          {q.last_outcome && <Badge text={q.last_outcome} style={OUTCOME_STYLE[q.last_outcome] || {}} />}
                          {q.status !== "solved" ? (
                            <button
                              type="button"
                              disabled={submitting === q.session_question_id}
                              onClick={e => { e.stopPropagation(); handleSubmit(q.session_question_id, "solved"); }}
                              style={{
                                marginLeft: "auto",
                                background: "transparent",
                                color: "#9A9A98",
                                border: "1px solid #E5E2D8",
                                borderRadius: 999,
                                padding: "2px 8px",
                                fontSize: 10,
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "inherit",
                                opacity: submitting === q.session_question_id ? 0.5 : 1,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {submitting === q.session_question_id ? "…" : "Solved ✓"}
                            </button>
                          ) : (
                            <span style={{ marginLeft: "auto", fontSize: 13, color: "#1A7A48" }}>✓</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Col 2: code editor fills height */}
            <div style={{ overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
              <CodeEditor
                questionId={activeQuestion?.session_question_id}
                apiCode={apiCode}
                onReviewRequest={handleReviewRequest}
                reviewLoading={reviewLoading}
                inlineHints={review?.status === "done" ? (review.inline_hints || []) : []}
              />
            </div>

            {/* Col 3: feedback + chat (only when review exists) */}
            {review && (
              <div style={{ overflow: "hidden", display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
                <div style={{ overflowY: "auto", flexShrink: 0, maxHeight: review.status === "done" ? "58%" : "100%" }}>
                  <CodeReviewPanel review={review} onDismiss={handleDismissReview} />
                </div>
                {review.status === "done" && (
                  <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                    <ChatPanel sessionId={sessionId} reviewId={review.review_id} />
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      ) : null}
    </div>
  );
}
