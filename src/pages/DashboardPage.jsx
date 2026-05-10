import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppNav } from "../components/AppNav";
import { apiFetch } from "../lib/utils";

const STATUS_STYLE = {
  active:    { background: "#EBF5FF", color: "#1D6FA4", border: "1px solid #BDDCF5" },
  completed: { background: "#EDFBF3", color: "#1A7A48", border: "1px solid #B6EDD0" },
  abandoned: { background: "#F5F4F1", color: "#6B6B6B", border: "1px solid #E0DDD3" },
};

function StatusBadge({ status }) {
  const style = STATUS_STYLE[status] || STATUS_STYLE.abandoned;
  return (
    <span
      style={{
        ...style,
        display: "inline-flex",
        borderRadius: 999,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.02em",
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}

function SessionCard({ session, onDelete, deleting }) {
  const isActive = session.status === "active";
  return (
    <article
      style={{
        background: "#FFFFFF",
        border: "1px solid #E5E2D8",
        borderRadius: 14,
        padding: "20px 22px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "-0.025em",
            color: "#1A1A1A",
            margin: 0,
            fontFamily: "Martel Sans, sans-serif",
          }}
        >
          {session.company_name}
        </h2>
        <StatusBadge status={session.status} />
      </div>
      <p style={{ fontSize: 13, color: "#6B6B6B", margin: 0 }}>
        {session.timeline_weeks ? `${session.timeline_weeks} weeks` : "No timeline set"}
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        <Link
          to={`/session/${session.id}`}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#1A1A1A",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {isActive ? "Continue →" : "View →"}
        </Link>
        {!isActive && (
          <button
            type="button"
            onClick={() => onDelete(session.id)}
            disabled={deleting}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontSize: 12,
              color: "#9A9A98",
              cursor: deleting ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { if (!deleting) e.currentTarget.style.color = "#C0392B"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#9A9A98"; }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
    </article>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
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

  const activeSessions = useMemo(
    () => sessions.filter((s) => s.status === "active"),
    [sessions],
  );
  const pastSessions = useMemo(
    () => sessions.filter((s) => s.status !== "active"),
    [sessions],
  );

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

  const newSessionAction = (
    <Link
      to="/start"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "#1A1A1A",
        color: "#FFFFFF",
        borderRadius: 999,
        padding: "6px 16px",
        fontSize: 13,
        fontWeight: 500,
        textDecoration: "none",
      }}
    >
      + New session
    </Link>
  );

  return (
    <div style={{ minHeight: "100vh" }}>
      <AppNav
        email={email}
        onLogout={handleLogout}
        loggingOut={loggingOut}
        actions={newSessionAction}
      />

      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "40px 40px 80px",
        }}
      >
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "40vh",
            }}
          >
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
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
            {error && (
              <p style={{ fontSize: 13, color: "#C0392B" }}>{error}</p>
            )}

            {activeSessions.length > 0 && (
              <section>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.16em",
                    color: "#9A9A98",
                    marginBottom: 20,
                  }}
                >
                  Active sessions
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 14,
                  }}
                >
                  {activeSessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onDelete={deleteSession}
                      deleting={deletingSessionId === session.id}
                    />
                  ))}
                </div>
              </section>
            )}

            {pastSessions.length > 0 && (
              <section>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.16em",
                    color: "#9A9A98",
                    marginBottom: 20,
                  }}
                >
                  Past sessions
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 14,
                  }}
                >
                  {pastSessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onDelete={deleteSession}
                      deleting={deletingSessionId === session.id}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
