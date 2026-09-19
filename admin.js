const API = (import.meta.env?.VITE_API_BASE || (location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? 'http://localhost:5000' : '')).replace(/\/$/, '');
const TOKEN_KEY = "why_wadada_admin_token";
// Fallback only — used if /api/lgas can't be reached. The backend's
// constants/lgas.js is the source of truth.
const FALLBACK_LGAS = [
  "Akwanga",
  "Awe",
  "Doma",
  "Karu",
  "Keana",
  "Keffi",
  "Kokona",
  "Lafia",
  "Nasarawa",
  "Nasarawa Eggon",
  "Obi",
  "Toto",
  "Wamba",
];

const $ = (id) => document.getElementById(id);
let admin = null;

function showDashboardError(message) {
  const el = $("dashboardError");
  if (!el) return;
  if (!message) {
    el.classList.add("hidden");
    el.textContent = "";
    return;
  }
  el.textContent = message;
  el.classList.remove("hidden");
}

// Auth: Bearer token in the Authorization header, stored in localStorage.
// (Backend also sets an httpOnly cookie on login as a bonus for same-origin
// deployments, but it can't be relied on as the ONLY mechanism here —
// frontend and backend normally run on different origins in this project,
// and browsers don't attach SameSite=Lax cookies to cross-origin fetch()
// calls at all, only to top-level navigations. That's what broke login
// after the pure-cookie change: the cookie was set but never sent back.)
function token() {
  return localStorage.getItem(TOKEN_KEY);
}
function headers(json = false) {
  const h = { Accept: "application/json" };
  if (json) h["Content-Type"] = "application/json";
  if (token()) h.Authorization = `Bearer ${token()}`;
  return h;
}
async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    credentials: "include",
    headers: { ...headers(), ...(options.headers || {}) },
  });
  if (response.status === 401) {
    logout();
    throw new Error("Session expired.");
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}
function fmt(n) {
  return Number(n || 0).toLocaleString();
}
function date(v) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(v));
}
function time(v) {
  return new Intl.DateTimeFormat("en-NG", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(v),
  );
}
function esc(v) {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[m],
  );
}
function roleLabel(role) {
  return (
    {
      super_admin: "SUPER ADMIN",
      lga_coordinator: "LGA COORDINATOR",
      ward_coordinator: "WARD COORDINATOR",
    }[role] || role
  );
}
function scopeLabel(a) {
  return a?.ward ? `${a.ward}, ${a.lga}` : a?.lga || "All Nasarawa State";
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  admin = null;
  // Best-effort: also clears the httpOnly cookie server-side, if set.
  fetch(`${API}/api/admin/logout`, { method: "POST", credentials: "include" }).catch(() => {});
  $("appView").classList.add("hidden");
  $("loginView").classList.remove("hidden");
}
function showApp() {
  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  loadMe();
}
// Only ask the server to validate a session if we actually have a token —
// otherwise every fresh visitor generates a doomed /api/admin/me call and a
// console error before the login form even shows.
if (token()) showApp();
else if (location.pathname.endsWith('/admin.html') || location.pathname === '/admin.html') {
  window.location.replace('admin-login.html');
}
async function loadMe() {
  try {
    const d = await api("/api/admin/me");
    admin = d.admin;
    $("adminEmail").textContent = admin.email;
    $("roleBadge").textContent = roleLabel(admin.role);
    $("adminScope").textContent = scopeLabel(admin);
    const superAdmin = admin.role === "super_admin";
    document.querySelectorAll(".super-only,.super-only-section").forEach((el) => {
      el.classList.toggle("hidden", !superAdmin);
    });
    if (!superAdmin && $("activity")) $("activity").classList.add("hidden");
    if (superAdmin) {
      openSection("admins");
    } else {
      // LGA/Ward Coordinator roles currently have no section of their own
      // — every remaining tab (Admin Management, Media & Gallery, Activity
      // Log) is Super Admin-only, since they existed to manage supporter
      // data that's since been removed. Show an explicit message instead
      // of leaving a blank content area.
      $("sectionTitle").textContent = "Command Centre";
      const main = document.querySelector(".main");
      const notice = document.createElement("div");
      notice.className = "dashboard-error";
      notice.textContent =
        "Your role doesn't have access to any sections yet. Contact a Super Admin.";
      main?.insertBefore(notice, main.querySelector(".section"));
    }
  } catch (e) {
    console.error(e);
    showDashboardError("Couldn't load your admin profile: " + e.message);
  }
}
$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("loginError").textContent = "";
  const btn = e.target.querySelector("button");
  btn.disabled = true;
  try {
    const r = await fetch(`${API}/api/admin/login`, {
      method: "POST",
      credentials: "include",
      headers: headers(true),
      body: JSON.stringify({ email: $("email").value, password: $("password").value }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || "Login failed");
    localStorage.setItem(TOKEN_KEY, d.token);
    showApp();
  } catch (err) {
    $("loginError").textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});
$("logout").addEventListener("click", logout);
$("refresh").addEventListener("click", () => {
  const activeNav = document.querySelector(".nav[data-section].active");
  if (activeNav) openSection(activeNav.dataset.section);
});

document
  .querySelectorAll(".nav[data-section], [data-go]")
  .forEach((btn) =>
    btn.addEventListener("click", () => openSection(btn.dataset.section || btn.dataset.go)),
  );
function openSection(name) {
  if ((name === "activity" || name === "admins") && admin?.role !== "super_admin") return;
  showDashboardError(null);
  // #intelligencePanel deliberately shares the .section class for spacing
  // but isn't one of the nav-driven tabs (no sidebar button targets it) —
  // exclude it here or it gets hidden on the first tab switch and never
  // shown again, since nothing else ever removes "hidden" from it.
  document.querySelectorAll(".section:not(#intelligencePanel)").forEach((s) => s.classList.add("hidden"));
  $(name).classList.remove("hidden");
  document
    .querySelectorAll(".nav[data-section]")
    .forEach((n) => n.classList.toggle("active", n.dataset.section === name));
  $("sectionTitle").textContent = {
    activity: "Activity Log",
    admins: "Admin Management",
    media: "Media & Gallery",
  }[name];
  if (name === "activity") loadActivity();
}

async function loadActivity() {
  if (admin?.role !== "super_admin") return;
  try {
    const d = await api("/api/admin/activity");
    $("activityRows").innerHTML =
      d.data
        .map((x) => {
          const scope = x.scope?.ward
            ? `${x.scope.ward}, ${x.scope.lga}`
            : x.scope?.lga || "All Nasarawa";
          return `<tr><td>${date(x.createdAt)} ${time(x.createdAt)}</td><td class="activity-action">${esc(x.action.replaceAll("_", " "))}</td><td>${esc(x.email)}</td><td>${esc(roleLabel(x.role))}</td><td>${esc(scope)}</td></tr>`;
        })
        .join("") || "<tr><td colspan='5'>No activity yet.</td></tr>";
  } catch (e) {
    console.error(e);
    showDashboardError("Couldn't load activity log: " + e.message);
  }
}

/* ============================================================
   ADMIN ACCESS CENTRE
   ============================================================ */
function adminScopeText(a) {
  if (a?.ward) return `${esc(a.ward)}, ${esc(a.lga || "")}`;
  return a?.lga ? esc(a.lga) : "All Nasarawa State";
}
function adminInitials(email = "") {
  const base = String(email)
    .split("@")[0]
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return esc(
    (base.length > 1 ? base[0][0] + base[1][0] : base[0]?.slice(0, 2) || "AD").toUpperCase(),
  );
}
function roleClass(role) {
  return role === "lga_coordinator" ? "role-lga" : role === "ward_coordinator" ? "role-ward" : "";
}
let modalTriggerEl = null;
function getFocusableEls(container) {
  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null);
}
// Keeps Tab/Shift+Tab cycling inside whichever .admin-modal is currently
// open, instead of silently walking focus out into the dashboard behind it
// (which is how a keyboard user could trigger a section switch while a
// modal was still logically "open" — see the create-admin modal fix).
document.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const openDialog = document.querySelector(".admin-modal:not(.hidden) .admin-modal-dialog");
  if (!openDialog) return;
  const focusables = getFocusableEls(openDialog);
  if (!focusables.length) return;
  const first = focusables[0],
    last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  } else if (!openDialog.contains(document.activeElement)) {
    e.preventDefault();
    first.focus();
  }
});
function openAdminModal() {
  const m = $("createAdminModal");
  if (!m) return;
  modalTriggerEl = document.activeElement;
  m.classList.remove("hidden");
  m.setAttribute("aria-hidden", "false");
  document.body.classList.add("admin-modal-open");
  setTimeout(() => $("newAdminEmail")?.focus(), 50);
  fillAdminLgaSelect();
  updateAdminRoleFields();
}
function closeAdminModal() {
  const m = $("createAdminModal");
  if (!m || m.classList.contains("hidden")) return;
  m.classList.add("hidden");
  m.setAttribute("aria-hidden", "true");
  document.body.classList.remove("admin-modal-open");
  const form = $("createAdminForm");
  if (form) form.reset();
  if ($("createAdminMessage")) {
    $("createAdminMessage").className = "form-message";
    $("createAdminMessage").textContent = "";
  }
  updateAdminRoleFields();
  modalTriggerEl?.focus();
  modalTriggerEl = null;
}

async function loadAdminDirectory() {
  if (admin?.role !== "super_admin" || !$("adminRows")) return;
  try {
    const d = await api("/api/admin/admins");
    const admins = d.data || [];
    const lgaCount = admins.filter((a) => a.role === "lga_coordinator").length;
    const wardCount = admins.filter((a) => a.role === "ward_coordinator").length;
    $("adminTotal").textContent = fmt(admins.length);
    $("adminLgaCount").textContent = fmt(lgaCount);
    $("adminWardCount").textContent = fmt(wardCount);
    window.__adminDirectory = admins;
    renderAdminDirectory();
  } catch (e) {
    showDashboardError("Couldn't load administrator accounts: " + e.message);
  }
}
function renderAdminDirectory() {
  const rows = $("adminRows");
  if (!rows) return;
  const list = window.__adminDirectory || [];
  const q = ($("adminSearch")?.value || "").trim().toLowerCase();
  const role = $("adminRoleFilter")?.value || "";
  const filtered = list.filter((a) => {
    const hay = [a.email, a.role, a.lga, a.ward].filter(Boolean).join(" ").toLowerCase();
    return (!q || hay.includes(q)) && (!role || a.role === role);
  });
  rows.innerHTML =
    filtered
      .map((a) => {
        const status =
          a.active === false
            ? `<span class="admin-status inactive"><i></i>Disabled</span>`
            : `<span class="admin-status"><i></i>Active</span>`;
        const scope = a.ward
          ? `<strong>${esc(a.lga || "—")}</strong><small>${esc(a.ward)}</small>`
          : `<strong>${esc(a.lga || "All Nasarawa State")}</strong><small>${a.role === "super_admin" ? "Full campaign access" : "LGA-wide access"}</small>`;
        return `<tr>
      <td><div class="admin-person"><span class="admin-avatar">${adminInitials(a.email)}</span><div><strong>${esc(a.email)}</strong><small>${a.createdBy ? `Added by ${esc(a.createdBy)}` : "System account"}</small></div></div></td>
      <td><span class="admin-role-pill ${roleClass(a.role)}">${esc(roleLabel(a.role))}</span></td>
      <td><div class="admin-scope-cell">${scope}</div></td>
      <td><span class="admin-date-cell">${date(a.createdAt)}</span></td>
      <td>${status}</td>
      <td><div class="admin-row-actions">
        <button class="row-action" data-admin-action="activity" data-admin-id="${esc(a._id)}" title="View activity">Activity</button>
        <button class="row-action" data-admin-action="edit" data-admin-id="${esc(a._id)}" title="Edit administrator">Edit</button>
        <button class="row-action" data-admin-action="reset" data-admin-id="${esc(a._id)}" title="Reset password">Reset</button>
        <button class="row-action ${a.active === false ? "enable" : "danger"}" data-admin-action="toggle" data-admin-id="${esc(a._id)}" data-admin-active="${a.active !== false}" title="${a.active === false ? "Enable" : "Disable"}">${a.active === false ? "Enable" : "Disable"}</button>
      </div></td>
    </tr>`;
      })
      .join("") ||
    `<tr><td colspan="6" class="admin-empty"><strong>${list.length ? "No administrators match your filters" : "No coordinator accounts yet"}</strong><span>${list.length ? "Try a different search or role filter." : "Use Add administrator to create the first coordinator account."}</span></td></tr>`;
}

async function fillAdminLgaSelect() {
  if (!$("newAdminLga")) return;
  let lgas = FALLBACK_LGAS;
  try {
    const response = await fetch(`${API}/api/lgas`, { headers: { Accept: "application/json" } });
    if (response.ok) {
      const d = await response.json();
      if (Array.isArray(d.data) && d.data.length) lgas = d.data;
    }
  } catch {}
  $("newAdminLga").innerHTML =
    `<option value="">Select an LGA</option>` +
    lgas.map((x) => `<option value="${esc(x)}">${esc(x)}</option>`).join("");
}
async function fillAdminWardSelect() {
  const lga = $("newAdminLga")?.value || "";
  const ward = $("newAdminWard");
  if (!ward) return;
  ward.innerHTML = `<option value="">${lga ? "Loading wards…" : "Select an LGA first"}</option>`;
  ward.disabled = !lga;
  if (!lga) return;
  let wards = [];
  try {
    const response = await fetch(`${API}/api/wards?lga=${encodeURIComponent(lga)}`, {
      headers: { Accept: "application/json" },
    });
    if (response.ok) {
      const d = await response.json();
      if (Array.isArray(d.data)) wards = d.data;
    }
  } catch {}
  ward.innerHTML = wards.length
    ? `<option value="">Select a Ward</option>` +
      wards.map((x) => `<option value="${esc(x)}">${esc(x)}</option>`).join("")
    : `<option value="">No wards available</option>`;
  ward.disabled = !wards.length;
}
function updateAdminRoleFields() {
  const wardWrap = $("newAdminWardWrap");
  const isWard = $("newAdminRole")?.value === "ward_coordinator";
  if (wardWrap) wardWrap.classList.toggle("hidden", !isWard);
  if ($("newAdminWard")) $("newAdminWard").required = isWard;
  if (isWard) fillAdminWardSelect();
}

$("openCreateAdmin")?.addEventListener("click", openAdminModal);
document
  .querySelectorAll("[data-close-admin-modal]")
  .forEach((el) => el.addEventListener("click", closeAdminModal));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("createAdminModal")?.classList.contains("hidden")) closeAdminModal();
});
$("newAdminRole")?.addEventListener("change", updateAdminRoleFields);
$("newAdminLga")?.addEventListener("change", fillAdminWardSelect);
$("adminSearch")?.addEventListener("input", renderAdminDirectory);
$("adminRoleFilter")?.addEventListener("change", renderAdminDirectory);

$("createAdminForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = $("createAdminMessage");
  message.className = "form-message";
  message.textContent = "Creating secure administrator account…";
  const button = e.target.querySelector("button[type=submit]");
  button.disabled = true;
  try {
    const d = await api("/api/admin/admins", {
      method: "POST",
      headers: { ...headers(true) },
      body: JSON.stringify({
        email: $("newAdminEmail").value.trim(),
        password: $("newAdminPassword").value,
        role: $("newAdminRole").value,
        lga: $("newAdminLga").value,
        ward: $("newAdminWard").value || null,
      }),
    });
    message.textContent = d.message || "Administrator created successfully.";
    await loadAdminDirectory();
    setTimeout(closeAdminModal, 500);
  } catch (err) {
    message.className = "form-message error";
    message.textContent = err.message;
  } finally {
    button.disabled = false;
  }
});

const originalOpenSection = openSection;
openSection = function (name) {
  originalOpenSection(name);
  if (name === "admins" && admin?.role === "super_admin") {
    loadAdminDirectory();
  }
  if (name === "media" && admin?.role === "super_admin") {
    loadMediaLibrary();
  }
};

/* ============================================================
   ADMIN ACCOUNT CONTROLS + PERMISSION MATRIX
   ============================================================ */
const permissionLabels = {
  view_activity: "View audit activity",
  create_admin: "Create administrators",
  edit_admin: "Edit administrators",
  disable_admin: "Enable / disable administrators",
  reset_password: "Reset administrator passwords",
  manage_permissions: "Manage permissions",
};
function openModal(id) {
  const m = $(id);
  if (!m) return;
  modalTriggerEl = document.activeElement;
  m.classList.remove("hidden");
  m.setAttribute("aria-hidden", "false");
  document.body.classList.add("admin-modal-open");
  const dialog = m.querySelector(".admin-modal-dialog");
  const first = dialog && getFocusableEls(dialog)[0];
  setTimeout(() => (first || dialog)?.focus(), 50);
}
function closeModal(id) {
  const m = $(id);
  if (!m || m.classList.contains("hidden")) return;
  m.classList.add("hidden");
  m.setAttribute("aria-hidden", "true");
  document.body.classList.remove("admin-modal-open");
  modalTriggerEl?.focus();
  modalTriggerEl = null;
}
function setMessage(id, text, error = false) {
  const el = $(id);
  if (!el) return;
  el.className = `form-message${error ? " error" : ""}`;
  el.textContent = text;
}
async function openEditAdmin(id) {
  const a = (window.__adminDirectory || []).find((x) => x._id === id);
  if (!a) return;
  $("editAdminId").value = id;
  $("editAdminEmail").value = a.email;
  $("editAdminRole").value = a.role;
  await fillEditLga(a.lga || "");
  updateEditRoleFields();
  if (a.ward) {
    await fillEditWard(a.lga, a.ward);
  }
  setMessage("editAdminMessage", "");
  openModal("editAdminModal");
  setTimeout(() => $("editAdminEmail")?.focus(), 50);
}
async function fillEditLga(selected = "") {
  let lgas = FALLBACK_LGAS;
  try {
    const r = await fetch(`${API}/api/lgas`, { headers: { Accept: "application/json" } });
    if (r.ok) {
      const d = await r.json();
      if (Array.isArray(d.data) && d.data.length) lgas = d.data;
    }
  } catch {}
  $("editAdminLga").innerHTML =
    `<option value="">Select an LGA</option>` +
    lgas
      .map(
        (x) => `<option value="${esc(x)}" ${x === selected ? "selected" : ""}>${esc(x)}</option>`,
      )
      .join("");
}
async function fillEditWard(lga, selected = "") {
  const w = $("editAdminWard");
  if (!w) return;
  w.innerHTML = `<option value="">${lga ? "Loading wards…" : "Select an LGA first"}</option>`;
  w.disabled = !lga;
  if (!lga) return;
  let wards = [];
  try {
    const r = await fetch(`${API}/api/wards?lga=${encodeURIComponent(lga)}`, {
      headers: { Accept: "application/json" },
    });
    if (r.ok) {
      const d = await r.json();
      wards = Array.isArray(d.data) ? d.data : [];
    }
  } catch {}
  w.innerHTML =
    (wards.length
      ? `<option value="">Select a Ward</option>`
      : `<option value="">No wards available</option>`) +
    wards
      .map(
        (x) => `<option value="${esc(x)}" ${x === selected ? "selected" : ""}>${esc(x)}</option>`,
      )
      .join("");
  w.disabled = !wards.length;
}
function updateEditRoleFields() {
  const ward = $("editAdminRole")?.value === "ward_coordinator";
  $("editAdminWardWrap")?.classList.toggle("hidden", !ward);
  if (ward) fillEditWard($("editAdminLga")?.value || "");
}
async function toggleAdmin(id, active) {
  const a = (window.__adminDirectory || []).find((x) => x._id === id);
  if (!a) return;
  const verb = active ? "disable" : "enable";
  if (!confirm(`Are you sure you want to ${verb} ${a.email}?`)) return;
  try {
    await api(`/api/admin/admins/${encodeURIComponent(id)}/toggle`, {
      method: "POST",
      headers: { ...headers(true) },
      body: JSON.stringify({ active: !active }),
    });
    await loadAdminDirectory();
  } catch (e) {
    showDashboardError(e.message);
  }
}
function openResetAdmin(id) {
  const a = (window.__adminDirectory || []).find((x) => x._id === id);
  if (!a) return;
  $("resetAdminId").value = id;
  $("resetAdminPassword").value = "";
  setMessage("resetAdminMessage", "");
  $("resetAdminTitle").textContent = `Reset password`;
  $("resetAdminForm").dataset.email = a.email;
  openModal("resetAdminModal");
  setTimeout(() => $("resetAdminPassword")?.focus(), 50);
}
async function openAccountActivity(id) {
  const a = (window.__adminDirectory || []).find((x) => x._id === id);
  if (!a) return;
  $("accountActivitySubtitle").textContent =
    `Recent security and administrative events for ${a.email}.`;
  $("accountActivityList").innerHTML =
    '<div class="activity-loading">Loading account activity…</div>';
  openModal("adminActivityModal");
  try {
    const d = await api(`/api/admin/admins/${encodeURIComponent(id)}/activity`);
    const rows = d.data || [];
    $("accountActivityList").innerHTML =
      rows
        .map(
          (x) =>
            `<div class="account-activity-item"><div class="activity-dot"></div><div><strong>${esc(x.action.replaceAll("_", " "))}</strong><p>${esc(x.meta?.targetEmail || x.meta?.email || x.email || "System")}</p></div><time>${date(x.createdAt)} ${time(x.createdAt)}</time></div>`,
        )
        .join("") || '<div class="activity-empty">No activity recorded for this account yet.</div>';
  } catch (e) {
    $("accountActivityList").innerHTML = `<div class="activity-empty">${esc(e.message)}</div>`;
  }
}

$("adminRows")?.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-admin-action]");
  if (!b) return;
  const id = b.dataset.adminId,
    action = b.dataset.adminAction;
  if (action === "edit") openEditAdmin(id);
  if (action === "reset") openResetAdmin(id);
  if (action === "activity") openAccountActivity(id);
  if (action === "toggle") toggleAdmin(id, b.dataset.adminActive === "true");
});
$("editAdminRole")?.addEventListener("change", updateEditRoleFields);
$("editAdminLga")?.addEventListener("change", () => {
  if ($("editAdminRole")?.value === "ward_coordinator") fillEditWard($("editAdminLga").value);
});
document
  .querySelectorAll("[data-close-edit-modal]")
  .forEach((x) => x.addEventListener("click", () => closeModal("editAdminModal")));
document
  .querySelectorAll("[data-close-reset-modal]")
  .forEach((x) => x.addEventListener("click", () => closeModal("resetAdminModal")));
document
  .querySelectorAll("[data-close-activity-modal]")
  .forEach((x) => x.addEventListener("click", () => closeModal("adminActivityModal")));
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  ["editAdminModal", "resetAdminModal", "adminActivityModal"].forEach(closeModal);
});

$("editAdminForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("editAdminId").value;
  setMessage("editAdminMessage", "Saving changes…");
  const b = e.target.querySelector("button[type=submit]");
  b.disabled = true;
  try {
    const d = await api(`/api/admin/admins/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...headers(true) },
      body: JSON.stringify({
        email: $("editAdminEmail").value.trim(),
        role: $("editAdminRole").value,
        lga: $("editAdminLga").value,
        ward: $("editAdminWard").value || null,
      }),
    });
    setMessage("editAdminMessage", d.message || "Saved.");
    await loadAdminDirectory();
    setTimeout(() => closeModal("editAdminModal"), 500);
  } catch (err) {
    setMessage("editAdminMessage", err.message, true);
  } finally {
    b.disabled = false;
  }
});
$("resetAdminForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("resetAdminId").value;
  setMessage("resetAdminMessage", "Resetting password…");
  const b = e.target.querySelector("button[type=submit]");
  b.disabled = true;
  try {
    const d = await api(`/api/admin/admins/${encodeURIComponent(id)}/reset-password`, {
      method: "POST",
      headers: { ...headers(true) },
      body: JSON.stringify({ password: $("resetAdminPassword").value }),
    });
    setMessage("resetAdminMessage", d.message || "Password reset.");
    setTimeout(() => closeModal("resetAdminModal"), 700);
  } catch (err) {
    setMessage("resetAdminMessage", err.message, true);
  } finally {
    b.disabled = false;
  }
});

async function loadPermissionMatrix() {
  if (admin?.role !== "super_admin" || !$("permissionRows")) return;
  try {
    const d = await api("/api/admin/permissions");
    const roles = d.roles;
    const keys = Object.keys(permissionLabels);
    $("permissionRows").innerHTML = keys
      .map(
        (k) =>
          `<tr><td><strong>${permissionLabels[k]}</strong></td>${["super_admin", "lga_coordinator", "ward_coordinator"].map((r) => `<td><span class="permission-check ${roles[r].permissions[k] ? "yes" : "no"}">${roles[r].permissions[k] ? "✓" : "—"}</span></td>`).join("")}</tr>`,
      )
      .join("");
  } catch (e) {
    showDashboardError("Couldn't load permission matrix: " + e.message);
  }
}
const originalLoadAdminDirectory = loadAdminDirectory;
loadAdminDirectory = async function () {
  await originalLoadAdminDirectory();
  await loadPermissionMatrix();
};

async function loadMediaLibrary() {
  if (admin?.role !== "super_admin" || !$("mediaLibrary")) return;
  const box = $("mediaLibrary");
  box.innerHTML = '<div class="media-library-empty">Loading media library…</div>';
  try {
    const d = await api("/api/admin/media");
    const items = d.data || [];
    box.innerHTML = items.length
      ? items
          .map(
            (m) =>
              `<article class="media-admin-item"><div class="media-admin-thumb">${m.type === "video" ? `<video src="${esc(m.url)}" muted preload="metadata"></video>` : `<img src="${esc(m.url)}" alt="${esc(m.title)}" loading="lazy">`}<span class="media-type">${esc(m.type)}</span></div><div class="media-admin-info"><div><strong>${esc(m.title)}</strong><small>${m.published ? "Published" : "Draft"} • ${date(m.createdAt)}</small></div>${m.description ? `<p>${esc(m.description)}</p>` : ""}<button class="row-action danger media-delete" data-media-id="${esc(m._id)}">Delete</button></div></article>`,
          )
          .join("")
      : '<div class="media-library-empty"><strong>No campaign media yet.</strong><span>Upload your first field photo or video.</span></div>';
  } catch (e) {
    box.innerHTML = `<div class="media-library-empty error">${esc(e.message)}</div>`;
  }
}
$("mediaUploadForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = $("mediaFile")?.files?.[0],
    msg = $("mediaUploadMessage"),
    btn = e.target.querySelector("button[type=submit]");
  if (!file) {
    setMessage("mediaUploadMessage", "Choose a media file first.", true);
    return;
  }
  if (file.size > 12 * 1024 * 1024) {
    setMessage("mediaUploadMessage", "The file is larger than 12MB.", true);
    return;
  }
  btn.disabled = true;
  setMessage("mediaUploadMessage", "Uploading media…");
  try {
    // multipart/form-data, matching the backend's multer-based upload
    // endpoint. Don't set Content-Type manually — the browser generates
    // the required multipart boundary itself only when it's left unset.
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", $("mediaTitle").value.trim());
    formData.append("description", $("mediaDescription").value.trim());
    formData.append("published", String($("mediaPublished").checked));

    const r = await fetch(`${API}/api/admin/media/upload`, {
      method: "POST",
      credentials: "include",
      headers: headers(),
      body: formData,
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || "Upload failed.");
    setMessage("mediaUploadMessage", d.message || "Media uploaded successfully.");
    e.target.reset();
    $("mediaPublished").checked = true;
    $("mediaFileName").textContent = "Choose a photo or video";
    await loadMediaLibrary();
  } catch (err) {
    setMessage("mediaUploadMessage", err.message, true);
  } finally {
    btn.disabled = false;
  }
});
$("mediaFile")?.addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  if ($("mediaFileName"))
    $("mediaFileName").textContent = f
      ? `${f.name} • ${(f.size / 1048576).toFixed(1)} MB`
      : "Choose a photo or video";
});
$("refreshMedia")?.addEventListener("click", loadMediaLibrary);
$("mediaLibrary")?.addEventListener("click", async (e) => {
  const b = e.target.closest(".media-delete");
  if (!b) return;
  if (!confirm("Delete this media from the gallery?")) return;
  try {
    await api(`/api/admin/media/${encodeURIComponent(b.dataset.mediaId)}`, { method: "DELETE" });
    await loadMediaLibrary();
  } catch (err) {
    showDashboardError(err.message);
  }
});

(async function loadNotifications() {
  try {
    const n = await api("/api/admin/notifications");
    const el = document.getElementById("adminNotifications");
    if (el)
      el.textContent = n.data?.length
        ? "Latest alert: " + n.data[0].title + " — " + n.data[0].message
        : "No new campaign alerts.";
  } catch (e) {
    console.warn("Notifications unavailable", e);
  }
})();
