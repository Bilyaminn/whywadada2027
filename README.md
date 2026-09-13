# WHY WADADA — HEARTS Agenda 2027

Frontend in plain HTML/CSS/JavaScript, built and served with [Vite](https://vite.dev).

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

There is no more `config.js` to remember to edit — the API base URL is
baked into the build from these `.env` files via `import.meta.env?.VITE_API_BASE`.

## New in this version

### 1. Supporter counter
The homepage has a live-looking supporter counter UI, but it intentionally does **not invent a number**. It requests:

`GET /api/supporters`

Expected response:

```json
{"count": 12345}
```

When the endpoint is connected, the number animates into view and the status changes to "Live registration data".

### 2. LGA directory
All 13 Nasarawa State LGAs are included with search/filter functionality:
Akwanga, Awe, Doma, Karu, Keana, Keffi, Kokona, Lafia, Nasarawa, Nasarawa Eggon, Obi, Toto and Wamba.

The cards are ready for adding verified coordinator contacts, event information, registration totals or links to LGA pages.

### 3. Advanced poster generator
`generate.html` now has:
- supporter photo upload
- live canvas preview
- drag-to-position supporter photo
- zoom slider
- mouse-wheel zoom
- touch/pointer dragging
- reset/fit control
- two poster templates (Flyer, Cover)
- supporter name
- APC / 2027 treatment
- HEARTS Agenda branding
- candidate image
- HD PNG export
- fullscreen preview
- mobile-responsive UI

The supplied Wadada image is used as both the candidate visual and the favicon.

## Run
`npm run dev` (see the top of this README) or `npm run build && npm run preview` for a production check.

## Production note
Before launch, replace placeholder HEARTS Agenda descriptions with officially approved wording and connect `/api/supporters` to the real registration database.

## Supporter backend
The `backend/` directory contains the Express + MongoDB API for live supporter registration and the homepage counter. See `backend/README.md` for setup.

## Admin dashboard
Open `admin.html` to access the protected campaign command centre. Configure `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, and `JWT_SECRET` in `backend/.env` first — see `ADMIN_SETUP.md` for generating the password hash.


## Campaign command centre v2
The admin dashboard now includes role-based access (Super Admin, LGA Coordinator, Ward Coordinator), server-side data scoping, ward analytics, LGA leaderboards, 30/60/90-day registration trends, CSV exports, and a Super Admin activity log.

## React islands
`admin.html`'s Supporters tab and LGA & Ward tab are each standalone React components rather than hand-rolled DOM manipulation — see `src/supporters/README.md` and `src/lga-ward/README.md`. Run both islands' integration tests with `npm run test:react` (or individually via `npm run test:supporters` / `npm run test:lga-ward`).

## HEARTS Agenda content integration
The public site now incorporates the supplied Wadada HEARTS Agenda (2027–2031), including the six HEARTS pillars and their stated goals/key activities, cross-cutting enablers, delivery/accountability framework, biography, professional background and selected honours. The wording is based on the supplied campaign document rather than invented placeholder policy copy.
