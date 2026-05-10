import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../lib/utils";

const statusClasses = {
  active: "bg-sky-50 text-sky-700 ring-sky-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  abandoned: "bg-stone-100 text-stone-500 ring-stone-200",
};

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

export function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [sessions, setSessions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [expandedCompanyId, setExpandedCompanyId] = useState(null);
  const [timelineWeeks, setTimelineWeeks] = useState("");
  const [creatingFor, setCreatingFor] = useState("");
  const [updatingSessionId, setUpdatingSessionId] = useState("");
  const [deletingSessionId, setDeletingSessionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [meResp, sessionsResp, companiesResp] = await Promise.all([
          apiFetch("/api/user/auth/me"),
          apiFetch("/api/user/sessions"),
          apiFetch("/api/user/companies"),
        ]);

        const [meData, sessionsData, companiesData] = await Promise.all([
          meResp ? meResp.json() : null,
          sessionsResp ? sessionsResp.json() : null,
          companiesResp ? companiesResp.json() : null,
        ]);

        setEmail(meData?.email || "");
        const loadedSessions = sessionsData?.sessions || [];
        setSessions(loadedSessions);
        setCompanies(companiesData?.companies || []);

        const activeSessions = loadedSessions.filter((session) => session.status === "active");
        const skipAutoRedirect = searchParams.get("from") === "session";
        if (!skipAutoRedirect && activeSessions.length === 1) {
          navigate(`/session/${activeSessions[0].id}`, { replace: true });
          return;
        }
      } catch (err) {
        setError("Unable to load your dashboard.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [navigate, searchParams]);

  const activeSessions = useMemo(
    () => sessions.filter((session) => session.status === "active"),
    [sessions],
  );

  const pastSessions = useMemo(
    () => sessions.filter((session) => session.status !== "active"),
    [sessions],
  );

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return companies;
    return companies.filter((company) => company.name.toLowerCase().includes(query));
  }, [companies, search]);

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

  async function handleCreateSession(companyId) {
    setCreatingFor(companyId);
    setError("");
    try {
      const resp = await apiFetch("/api/user/sessions", {
        method: "POST",
        body: JSON.stringify({
          company_id: companyId,
          timeline_weeks: timelineWeeks ? Number(timelineWeeks) : null,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Unable to create session.");
        return;
      }
      navigate(`/session/${data.id}`, { replace: true });
    } catch (err) {
      setError("Unable to create session.");
    } finally {
      setCreatingFor("");
    }
  }

  async function updateSessionStatus(sessionId, status) {
    setUpdatingSessionId(sessionId);
    setError("");
    try {
      const resp = await apiFetch(`/api/user/sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Unable to update session.");
        return;
      }
      setSessions((prev) => prev.map((session) => (
        session.id === sessionId ? { ...session, status: data.status } : session
      )));
      if (status === "active") {
        navigate(`/session/${sessionId}`, { replace: true });
      }
    } catch (err) {
      setError("Unable to update session.");
    } finally {
      setUpdatingSessionId("");
    }
  }

  async function deleteSession(sessionId) {
    if (!window.confirm("Delete this session? This will remove the study plan and session history.")) {
      return;
    }
    setDeletingSessionId(sessionId);
    setError("");
    try {
      const resp = await apiFetch(`/api/user/sessions/${sessionId}`, {
        method: "DELETE",
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Unable to delete session.");
        return;
      }
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
    } catch (err) {
      setError("Unable to delete session.");
    } finally {
      setDeletingSessionId("");
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
        ) : (
          <div className="space-y-12">
            {activeSessions.length > 0 ? (
              <section>
                <div className="mb-5">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">
                    Active sessions
                  </p>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {activeSessions.map((session) => (
                    <article
                      key={session.id}
                      className="min-w-[280px] rounded-lg border border-stone-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="font-heading text-2xl font-semibold text-stone-950">
                          {session.company_name}
                        </h2>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusClasses[session.status] || statusClasses.abandoned}`}
                        >
                          {session.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-stone-600">
                        {session.timeline_weeks ? `${session.timeline_weeks} weeks` : "No timeline set"}
                      </p>
                      <Link
                        to={`/session/${session.id}`}
                        className="mt-6 inline-flex text-sm font-semibold text-stone-950 transition hover:text-stone-700"
                      >
                        Continue →
                      </Link>
                      <button
                        type="button"
                        onClick={() => deleteSession(session.id)}
                        disabled={deletingSessionId === session.id}
                        className="mt-4 inline-flex rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingSessionId === session.id ? "Deleting..." : "Delete session"}
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {pastSessions.length > 0 ? (
              <section>
                <div className="mb-5">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">
                    Past sessions
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pastSessions.map((session) => (
                    <article
                      key={session.id}
                      className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="font-heading text-2xl font-semibold text-stone-950">
                          {session.company_name}
                        </h2>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusClasses[session.status] || statusClasses.abandoned}`}
                        >
                          {session.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-stone-600">
                        {session.timeline_weeks ? `${session.timeline_weeks} weeks` : "No timeline set"}
                      </p>
                      <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                          to={`/session/${session.id}`}
                          className="inline-flex text-sm font-semibold text-stone-950 transition hover:text-stone-700"
                        >
                          View session
                        </Link>
                        <button
                          type="button"
                          onClick={() => updateSessionStatus(session.id, "active")}
                          disabled={updatingSessionId === session.id || deletingSessionId === session.id}
                          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {updatingSessionId === session.id ? "Resuming..." : "Resume session"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSession(session.id)}
                          disabled={deletingSessionId === session.id}
                          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingSessionId === session.id ? "Deleting..." : "Delete session"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <div className="max-w-3xl">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">
                  Start a new prep session
                </p>
                <h1 className="mt-3 font-heading text-4xl font-semibold text-stone-950 sm:text-5xl">
                  Which company are you preparing for?
                </h1>
              </div>
              <div className="mt-6">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search companies"
                  className="w-full max-w-md rounded-md border border-stone-300 bg-white px-3 py-3 text-sm text-stone-950 outline-none transition focus:border-stone-500"
                />
              </div>
              {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCompanies.map((company) => {
                  const isExpanded = expandedCompanyId === company.id;
                  const isCreating = creatingFor === company.id;
                  return (
                    <article key={company.id} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedCompanyId(isExpanded ? null : company.id);
                          setTimelineWeeks("");
                          setError("");
                        }}
                        className="flex w-full items-start justify-between gap-3 text-left"
                      >
                        <div>
                          <h2 className="font-heading text-2xl font-semibold text-stone-950">
                            {company.name}
                          </h2>
                        </div>
                        <span className="mt-2 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      </button>

                      {isExpanded ? (
                        <div className="mt-5 border-t border-stone-200 pt-5">
                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-stone-700">
                              How many weeks do you have?
                            </span>
                            <input
                              type="number"
                              min="1"
                              max="52"
                              value={timelineWeeks}
                              onChange={(event) => setTimelineWeeks(event.target.value)}
                              className="w-full rounded-md border border-stone-300 bg-white px-3 py-3 text-sm text-stone-950 outline-none transition focus:border-stone-500"
                              placeholder="Optional"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleCreateSession(company.id)}
                            disabled={isCreating}
                            className="mt-4 rounded-md bg-stone-950 px-4 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                          >
                            {isCreating ? "Starting..." : "Start session"}
                          </button>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
