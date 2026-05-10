import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/utils";

export function DashboardPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch("/api/user/auth/me")
      .then((resp) => (resp ? resp.json() : null))
      .then((data) => {
        if (data?.email) {
          setEmail(data.email);
        }
      });
  }, []);

  async function handleLogout() {
    setLoading(true);
    try {
      await apiFetch("/api/user/auth/logout", { method: "POST" });
    } finally {
      localStorage.removeItem("crackd_user_token");
      navigate("/", { replace: true });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen px-6 py-8 sm:px-10">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">
            Dashboard
          </p>
          <h1 className="mt-3 font-heading text-4xl font-semibold text-stone-950">
            Welcome{email ? `, ${email}` : ""}.
          </h1>
          <p className="mt-4 text-base leading-7 text-stone-600">
            Your dashboard is being built.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="mt-8 rounded-md border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-300 hover:text-stone-950 disabled:cursor-not-allowed disabled:text-stone-400"
          >
            {loading ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>
    </div>
  );
}
