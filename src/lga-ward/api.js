// Same convention as src/supporters/api.js: a small standalone fetch
// wrapper, deliberately not shared, so this island and admin.js/the
// Supporters island can each be edited without coupling to the others.
// src/supporters/README.md flags that a THIRD island is the point where
// this duplication is worth extracting into a real shared module — this
// is the second, so it stays duplicated for now.
// Same fallback as admin.js/script.js/admin-login.js: when VITE_API_BASE
// isn't set (e.g. no .env.local in local dev), assume the backend is on
// its default port instead of silently hitting the Vite dev server itself.
// `typeof location` guard (rather than a bare reference) so this also
// loads cleanly under the Node/vite-node smoke tests, which have no
// global `location`.
const isLocalHost =
  typeof location !== "undefined" &&
  (location.hostname === "localhost" || location.hostname === "127.0.0.1");
const API = (import.meta.env?.VITE_API_BASE || (isLocalHost ? "http://localhost:5000" : "")).replace(/\/$/, "");
const TOKEN_KEY = "why_wadada_admin_token";

function token() {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders() {
  const h = { Accept: "application/json" };
  if (token()) h.Authorization = `Bearer ${token()}`;
  return h;
}

export async function apiGet(path) {
  const response = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: authHeaders()
  });
  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.reload();
    throw new Error("Session expired.");
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}
