# WHY WADADA — HEARTS Agenda 2027

Frontend in plain HTML/CSS/JavaScript, built and served with [Vite](https://vite.dev). No frontend framework — every page is a real static file.

## Run

```bash
npm install
npm run dev       # dev server with hot reload at http://localhost:5173
npm run build     # production build to dist/
npm run preview   # serve the production build locally, for a final check before deploying
```

`npm run dev` picks up `.env` automatically. To point at a different backend
without editing a committed file, create `.env.local` (gitignored) with:

```env
VITE_API_BASE=http://localhost:5000
```

`npm run build` picks up `.env.production` instead — set the real deployed
backend URL there before building for deployment. If frontend and backend
are served from the same origin, set `VITE_API_BASE=` (empty).

The API base URL is baked into the build from these `.env` files via
`import.meta.env?.VITE_API_BASE`. On `localhost`/`127.0.0.1` with no
`VITE_API_BASE` set, `script.js`, `admin.js`, and `admin-login.js` all fall
back to `http://localhost:5000` so local dev works without a `.env` file.

## Pages

- **`index.html`** — public campaign site: hero, About, the HEARTS Agenda
  (2027–2031), a poster CTA, the convener section, and a public "Movement
  Media" gallery fed by `GET /api/media`. There is no public supporter
  registration form or live supporter count — the site is poster-first.
- **`generate.html`** — the poster generator. Upload a photo, drag/zoom to
  position it, add your name, pick a template (Flyer or Cover — see
  `generator.js`), and export a HD PNG. Entirely client-side; doesn't touch
  the backend at all.
- **`admin.html`** / **`admin-login.html`** — the campaign command centre.
  See "Admin dashboard" below.

## Admin dashboard

Open `admin.html`. Configure `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, and
`JWT_SECRET` in `backend/.env` first — see `ADMIN_SETUP.md` for generating
the password hash.

Three sections, all Super Admin-only:
- **Admin Management** — create/edit/disable coordinator accounts, reset
  passwords, and the role/permission matrix.
- **Media & Gallery** — upload and manage the photos/videos shown in the
  public site's Movement Media gallery.
- **Activity Log** — audit trail of admin actions.

**Known gap:** LGA Coordinator and Ward Coordinator roles exist (used to
assign an admin's territory) but currently have no section of their own —
they were built around supporter registration data, which has been
removed. See `backend/README.md`'s "Admin roles" section for detail. A
logged-in coordinator sees an explicit "no access yet" message rather than
a blank screen.

## Backend

`backend/` is the Express + MongoDB API — admin auth, campaign content,
media gallery, and the `/api/lgas` / `/api/wards` config endpoints (used
for coordinator territory assignment, not supporter data). See
`backend/README.md`.

## HEARTS Agenda content

The public site's HEARTS Agenda section (2027–2031), including the six
HEARTS pillars and their stated goals/key activities, cross-cutting
enablers, delivery/accountability framework, biography, professional
background and selected honours, is based on the supplied campaign
document rather than invented placeholder policy copy.
