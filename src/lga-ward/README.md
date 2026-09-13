# LGA & Ward leaderboard — React island

`admin.html`'s "LGA & Ward" tab (the two ranked grids of LGA and ward
registration counts) is a standalone React component, replacing
`admin.js`'s old `loadLgas()` function. This is the second island — see
`src/supporters/README.md` for the first, and for why these stay
duplicated rather than sharing code (a third island is the documented
point to extract a shared module; this one doesn't trigger that yet).

## Files

- `main.jsx` — mounts `<LgaWardApp />` into `#lgaWardRoot`
- `LgaWardApp.jsx` — fetches `/api/admin/overview` (the same endpoint the
  Overview tab already uses — it returns `lgaStats` and `wardStats` in one
  response) and renders both grids
- `api.js`, `format.js` — same shape as the Supporters island's versions
- `_smoketest.jsx` — JSDOM + mocked `fetch` integration test:

  ```bash
  npx vite-node src/lga-ward/_smoketest.jsx
  ```

  Verifies real mocked data renders (LGA names, ward names), that the
  top-ranked LGA card gets the `.top` class and no other card does, that a
  blank ward value falls back to "Ward not supplied" text, and that
  exactly one network call is made.

## One quirk preserved on purpose

The ward card's progress bar has no matching `.ward-card .mini` CSS rule
(unlike the LGA card, which has `.lga-card .mini` / `.mini i`) — the
original markup relied entirely on an inline `style` attribute for the
bar's height and color. This looks like it may have been an oversight in
the original CSS, but this migration's job was to port `loadLgas()`
faithfully, not to redesign it — so the same inline style is reproduced
here rather than "fixed." Worth revisiting once the CSS pass happens.
