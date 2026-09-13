export function fmt(n) {
  return Number(n || 0).toLocaleString();
}

export function formatDate(v) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(v));
}
