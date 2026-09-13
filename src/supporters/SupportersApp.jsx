import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, downloadCsv } from "./api.js";
import { fmt, formatDate } from "./format.js";

// Fallback only — used if /api/lgas can't be reached. The backend's
// constants/lgas.js is the source of truth. (Kept in sync with the same
// fallback list in admin.js by hand — small and stable enough that a
// shared-constants module would be more machinery than it's worth here.)
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
  "Wamba"
];

const PAGE_SIZE = 25;

export default function SupportersApp() {
  const [me, setMe] = useState(null);
  // Gates the first supporters fetch until we know the caller's scope, so a
  // scoped LGA/Ward Coordinator never even briefly requests/sees data
  // outside their own area while /api/admin/me is still in flight.
  const [meResolved, setMeResolved] = useState(false);
  const [lgas, setLgas] = useState(FALLBACK_LGAS);
  const [search, setSearch] = useState("");
  const [lgaFilter, setLgaFilter] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], pagination: { pages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const debounceRef = useRef(null);

  // Who's logged in — needed to lock the LGA filter for scoped coordinators,
  // same rule admin.js applied.
  useEffect(() => {
    apiGet("/api/admin/me")
      .then((d) => {
        setMe(d.admin);
        if (d.admin?.role === "lga_coordinator" || d.admin?.role === "ward_coordinator") {
          setLgaFilter(d.admin.lga || "");
        }
      })
      .catch(() => {
        /* admin.js's own auth flow already handles a real session failure */
      })
      .finally(() => setMeResolved(true));
  }, []);

  useEffect(() => {
    const isLocalHost =
      typeof location !== "undefined" &&
      (location.hostname === "localhost" || location.hostname === "127.0.0.1");
    const base = (import.meta.env?.VITE_API_BASE || (isLocalHost ? "http://localhost:5000" : "")).replace(
      /\/$/,
      ""
    );
    fetch(`${base}/api/lgas`, { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data?.data) && data.data.length) setLgas(data.data);
      })
      .catch(() => {
        /* use fallback */
      });
  }, []);

  const scopeLocked = me?.role === "lga_coordinator" || me?.role === "ward_coordinator";

  const query = useMemo(
    () =>
      new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        search,
        lga: lgaFilter
      }).toString(),
    [page, search, lgaFilter]
  );

  useEffect(() => {
    if (!meResolved) return;
    let cancelled = false;
    setLoading(true);
    apiGet(`/api/admin/supporters?${query}`)
      .then((d) => {
        if (cancelled) return;
        setResult(d);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, meResolved]);

  function onSearchChange(value) {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setPage(1), 300);
  }

  async function onExport() {
    setExporting(true);
    try {
      await downloadCsv(
        "/api/admin/export.csv",
        `why-wadada-supporters-${new Date().toISOString().slice(0, 10)}.csv`
      );
    } catch (e) {
      alert(e.message);
    } finally {
      setExporting(false);
    }
  }

  const pages = result.pagination?.pages || 1;
  const total = result.pagination?.total || 0;

  return (
    <>
      <div className="toolbar">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search name, phone or ward…"
        />
        <select
          value={lgaFilter}
          disabled={scopeLocked}
          onChange={(e) => {
            setLgaFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All LGAs</option>
          {lgas.map((lga) => (
            <option key={lga} value={lga}>
              {lga}
            </option>
          ))}
        </select>
        <button className="primary" onClick={onExport} disabled={exporting}>
          {exporting ? "Exporting…" : "Export CSV ↓"}
        </button>
      </div>

      <article className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Supporter</th>
                <th>Phone</th>
                <th>LGA</th>
                <th>Ward</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr>
                  <td colSpan={5}>Couldn't load supporters: {error}</td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={5}>Loading…</td>
                </tr>
              ) : result.data.length ? (
                result.data.map((x) => (
                  // Note: no manual HTML-escaping helper needed here — JSX
                  // escapes all text content by default, the class of bug
                  // admin.js's esc() helper existed to guard against.
                  <tr key={x._id || `${x.phone}-${x.createdAt}`}>
                    <td>
                      <strong>{x.name}</strong>
                    </td>
                    <td>{x.phone}</td>
                    <td>{x.lga}</td>
                    <td>{x.ward || "—"}</td>
                    <td>{formatDate(x.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No matching supporters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ←
          </button>
          <span>
            Page {page} of {pages} • {fmt(total)} records
          </span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            →
          </button>
        </div>
      </article>
    </>
  );
}
