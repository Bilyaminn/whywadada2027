const API_BASE = (import.meta.env?.VITE_API_BASE || (location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? 'http://localhost:5000' : '')).replace(/\/$/, '');

const form = document.getElementById('loginForm');
const btn = document.getElementById('loginBtn');
const error = document.getElementById('error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  error.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  try {
    const res = await fetch(`${API_BASE}/api/admin/login`, {
      method: 'POST',
      // credentials:'include' lets the browser store the httpOnly cookie
      // the server also sets — a bonus for same-origin deployments. The
      // Bearer token below is what actually carries the session across
      // origins for admin.js's fetch calls, since a SameSite=Lax cookie
      // set here won't be sent back on cross-origin fetch requests.
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 404 || res.status === 405) {
        throw new Error(`Admin API not found at ${API_BASE || '(this website)'}. Make sure the backend is running and VITE_API_BASE points to the deployed API.`);
      }
      if (res.status === 429) {
        throw new Error(data.message || 'Too many login attempts. Please wait and try again.');
      }
      throw new Error(data.message || 'Invalid email or password.');
    }

    // Must match admin.js's TOKEN_KEY exactly — this is what admin.html
    // checks on load to decide whether to show the dashboard or the
    // login form.
    localStorage.setItem('why_wadada_admin_token', data.token);
    window.location.href = 'admin.html';
  } catch (err) {
    error.textContent = err instanceof TypeError ? `Unable to connect to the admin API at ${API_BASE || '(this website)'}. Check that the backend is running and VITE_API_BASE is configured correctly.` : (err.message || 'Unable to sign in.');
    error.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign in to Dashboard';
  }
});
