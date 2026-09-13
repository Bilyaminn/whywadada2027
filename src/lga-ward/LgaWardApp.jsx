import { useEffect, useState } from "react";
import { apiGet } from "./api.js";
import { fmt } from "./format.js";

export default function LgaWardApp() {
  const [lgaStats, setLgaStats] = useState([]);
  const [wardStats, setWardStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // Same endpoint the Overview tab uses — /api/admin/overview already
    // returns both lgaStats and wardStats in one response, same as the
    // vanilla loadLgas() this replaces.
    apiGet("/api/admin/overview")
      .then((d) => {
        if (cancelled) return;
        setLgaStats(d.lgaStats || []);
        setWardStats((d.wardStats || []).slice(0, 30));
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
  }, []);

  if (loading) return <p className="muted">Loading LGA and ward data…</p>;
  if (error) return <p className="muted">Couldn't load LGA/ward data: {error}</p>;

  const lgaMax = Math.max(1, ...lgaStats.map((x) => x.count));
  const wardMax = Math.max(1, ...wardStats.map((x) => x.count));

  return (
    <>
      <div className="lga-grid">
        {lgaStats.length ? (
          lgaStats.map((x, i) => (
            <article key={x.lga} className={`lga-card ${i === 0 ? "top" : ""}`}>
              <span className="rank">RANK {String(i + 1).padStart(2, "0")}</span>
              <h4>{x.lga}</h4>
              <strong>{fmt(x.count)}</strong>
              <div className="mini">
                <i style={{ width: `${(x.count / lgaMax) * 100}%` }} />
              </div>
            </article>
          ))
        ) : (
          <p className="muted">No LGA data yet.</p>
        )}
      </div>

      <div className="ward-heading">
        <span className="eyebrow">TOP WARDS</span>
        <h3>Ward performance</h3>
      </div>
      <div className="ward-grid">
        {wardStats.length ? (
          wardStats.map((x, i) => (
            <article key={`${x.lga}-${x.ward}-${i}`} className="ward-card">
              <div className="meta">
                <span>#{String(i + 1).padStart(2, "0")}</span>
                <span>{x.lga}</span>
              </div>
              <h4>{x.ward || "Ward not supplied"}</h4>
              <strong>{fmt(x.count)}</strong>
              {/* No .ward-card .mini CSS rule exists (unlike .lga-card .mini) —
                  the original markup relies entirely on this inline style for
                  the bar's appearance. Kept identical for visual parity. */}
              <div className="mini">
                <i
                  style={{
                    display: "block",
                    height: "5px",
                    background: "var(--gold)",
                    width: `${(x.count / wardMax) * 100}%`
                  }}
                />
              </div>
            </article>
          ))
        ) : (
          <p className="muted">No ward data yet.</p>
        )}
      </div>
    </>
  );
}
