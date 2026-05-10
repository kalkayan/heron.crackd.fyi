import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/utils";

const typeClasses = {
  category: "bg-blue-50 text-blue-700 border-blue-200",
  technique: "bg-violet-50 text-violet-700 border-violet-200",
  variant: "bg-amber-50 text-amber-700 border-amber-200",
};

const difficultyClasses = {
  foundational: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  intermediate: "bg-amber-50 text-amber-700 ring-amber-200",
  advanced: "bg-red-50 text-red-700 ring-red-200",
};

const statusClasses = {
  queued: "bg-stone-100 text-stone-600 ring-stone-200",
  in_progress: "bg-sky-50 text-sky-700 ring-sky-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const orderedTypes = ["category", "technique", "variant"];

function UserNav({ email, onLogout, loggingOut }) {
  return (
    <header className="border-b border-stone-200 bg-[#f7f6f2]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
        <Link to="/" className="font-heading text-lg font-semibold tracking-tight text-stone-950">
          crackd.fyi
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden text-stone-600 sm:block">{email}</span>
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            className="rounded-md border border-stone-200 bg-white px-3 py-2 font-medium text-stone-700 transition hover:border-stone-300 hover:text-stone-950 disabled:cursor-not-allowed disabled:text-stone-400"
          >
            {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </div>
    </header>
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
      } catch (err) {
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
      if (groups[item.skill_type]) {
        groups[item.skill_type].push(item);
      }
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
      if (!resp.ok) {
        setError(data.error || "Unable to update session.");
        return;
      }
      navigate("/dashboard", { replace: true });
    } catch (err) {
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
      if (!resp.ok) {
        setError(data.error || "Unable to update session.");
        return;
      }
      setSession((prev) => prev ? { ...prev, status: data.status } : prev);
    } catch (err) {
      setError("Unable to update session.");
    } finally {
      setResuming(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this session? This will remove the study plan and session history.")) {
      return;
    }
    setDeleting(true);
    try {
      const resp = await apiFetch(`/api/user/sessions/${sessionId}`, {
        method: "DELETE",
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Unable to delete session.");
        return;
      }
      navigate("/dashboard?from=session", { replace: true });
    } catch (err) {
      setError("Unable to delete session.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f6f2]">
      <UserNav email={email} onLogout={handleLogout} loggingOut={loggingOut} />
      <main className="mx-auto w-full max-w-6xl px-6 py-8 sm:px-10 sm:py-10">
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : session ? (
          <div className="space-y-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Link to="/dashboard?from=session" className="text-sm font-medium text-stone-500 transition hover:text-stone-900">
                  ← Back to dashboard
                </Link>
                <h1 className="mt-4 font-heading text-4xl font-semibold text-stone-950 sm:text-5xl">
                  {session.company_name}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="text-sm text-stone-600">
                    {session.timeline_weeks ? `Timeline: ${session.timeline_weeks} weeks` : "No timeline set"}
                  </span>
                  <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 ring-1 ring-stone-200">
                    {session.status}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={session.status === "active" ? handleAbandon : handleResume}
                  disabled={abandoning || resuming || deleting}
                  className="rounded-md border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-300 hover:text-stone-950 disabled:cursor-not-allowed disabled:text-stone-400"
                >
                  {session.status === "active"
                    ? (abandoning ? "Abandoning..." : "Abandon session")
                    : (resuming ? "Resuming..." : "Resume session")}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete session"}
                </button>
              </div>
            </div>

            {orderedTypes.map((type) =>
              groupedPlan[type].length > 0 ? (
                <section key={type}>
                  <div className="mb-4 flex items-center gap-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${typeClasses[type]}`}>
                      {type}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {groupedPlan[type].map((item) => (
                      <article key={item.session_skill_id} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h2 className="font-heading text-2xl font-semibold text-stone-950">
                              {item.skill_name}
                            </h2>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {item.difficulty ? (
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${difficultyClasses[item.difficulty] || "bg-stone-100 text-stone-600 ring-stone-200"}`}>
                                  {item.difficulty}
                                </span>
                              ) : null}
                              <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 ring-1 ring-stone-200">
                                asked {item.count} {item.count === 1 ? "time" : "times"}
                              </span>
                            </div>
                          </div>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusClasses[item.status] || statusClasses.queued}`}>
                            {item.status}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null,
            )}

            {plan.length === 0 ? (
              <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-stone-600">
                  No published skills are available for this company yet.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
