import { useEffect, useState } from "react";
import { apiFetch } from "../lib/utils";

export function AuthGuard({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem("crackd_user_token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      try {
        const resp = await apiFetch("/api/user/auth/me");
        if (resp && resp.ok) {
          setAuthenticated(true);
        } else if (resp && resp.status !== 401) {
          window.location.href = "/login";
        }
      } catch (err) {
        console.error("User auth check failed", err);
        window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return children;
}
