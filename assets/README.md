# Why this folder exists (please don't delete it)

This is a **copy** of `../public/assets/`, kept in sync intentionally.

Vite's dev server and build process serve `public/` at the site root, so
`/assets/...` resolves correctly through `npm run dev` or a production
build without this folder existing at all.

But this project is also sometimes opened with a plain static file server
(Live Server, Five Server, `python -m http.server`, etc.) pointed directly
at the `frontend/` folder. Those tools don't know about Vite's `public/`
convention — they just serve files from wherever they physically sit. For
them, `/assets/...` needs a real `frontend/assets/` folder to resolve.

**If you replace or add an image in `public/assets/`, copy the same
change here too**, or this folder will silently drift out of sync and
you'll get confusing "it works in one place but not the other" bugs.

Best long-term fix: standardize on `npm run dev` (see the frontend
README) and this folder becomes unnecessary. Until then, keep both in
sync.
