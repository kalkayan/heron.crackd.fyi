const API_BASE = import.meta.env.VITE_API_BASE || "";

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("crackd_user_token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const resp = await fetch(apiUrl(path), { ...options, headers });
  if (resp.status === 401 && options.redirectOn401 !== false) {
    localStorage.removeItem("crackd_user_token");
    window.location.href = "/login";
    return;
  }
  return resp;
}
