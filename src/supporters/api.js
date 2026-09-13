// Mirrors admin.js's api()/headers()/token() exactly: same localStorage
// key, same Bearer-token-in-Authorization-header mechanism, same
// credentials:'include' (for the bonus same-origin cookie), same 401
// behaviour. Kept as a small standalone module rather than importing
// from admin.js so this island has no coupling to the vanilla script —
// either can be edited without touching the other.
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
    // Match admin.js's logout(): drop the token and send the user back to
    // the login view. A full reload is simplest here since this island
    // has no access to admin.js's in-memory app state.
    localStorage.removeItem(TOKEN_KEY);
    window.location.reload();
    throw new Error("Session expired.");
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

export async function downloadCsv(path, filenameFallback) {
  const response = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: authHeaders()
  });
  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.reload();
    throw new Error("Session expired.");
  }
  if (!response.ok) throw new Error("Export failed.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filenameFallback;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
