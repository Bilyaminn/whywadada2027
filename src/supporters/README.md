# Supporters — React island

`admin.html`'s Supporters tab (search, LGA filter, pagination, CSV export)
is a standalone React component, not part of `admin.js`'s vanilla
render-by-innerHTML code. Everything else in the admin panel — dashboard,
LGA/ward leaderboards, admin account management, notifications, content,
media — is unchanged.

## Why just this one tab

This tab was the best candidate to prove out a React island in isolation:
it's self-contained (search + filter + table + pagination + one export
button), it's the highest-churn part of the dashboard, and it doesn't share
DOM with any other tab. The rest of `admin.js` reads/writes a lot of shared
state (the logged-in admin's role, the currently open modal, section
navigation) that isn't yet factored out — migrating those pieces next would
mean either duplicating that shared state here or extracting it into a
proper shared module first.

## Files

- `main.jsx` — mounts `<SupportersApp />` into `#supportersRoot` (see
  `admin.html`'s Supporters `<section>`)
- `SupportersApp.jsx` — all component logic: search (debounced), LGA
  filter (locked for scoped LGA/Ward Coordinators, matching admin.js's
  rule), pagination, CSV export
- `api.js` — a small standalone fetch wrapper. Deliberately **not** shared
  with `admin.js`'s own `api()`/`token()`/`headers()` — same behavior
  (same localStorage key, same Bearer header, same 401-redirects-to-login
  handling), but kept separate so either file can be edited without
  coupling to the other. A second island (`src/lga-ward/`) duplicates this
  same pattern rather than sharing it — see that folder's README. A third
  island is the point where extracting a shared module becomes worth it.
- `format.js` — number/date formatting helpers, same output as admin.js's
  `fmt()`/`date()`
- `_smoketest.jsx` — a real integration test (JSDOM + mocked `fetch`),
  not a snapshot test. Run it with:

  ```bash
  npx vite-node src/supporters/_smoketest.jsx
  ```

  It verifies the component renders real mocked data (not just "doesn't
  crash"), that pagination reflects the mocked totals, and — the rule most
  worth protecting against regression — that an LGA/Ward Coordinator's
  filter is locked to their own LGA and the resulting API request is
  actually scoped (`lga=Karu`), not just visually disabled.

## One thing this fixes for free

`admin.js`'s vanilla table rendering used a manual `esc()` helper to guard
against XSS when interpolating supporter names into `innerHTML` strings.
JSX escapes all text content by default, so `SupportersApp.jsx` has no
equivalent helper to remember to call — the escaping isn't optional here.
