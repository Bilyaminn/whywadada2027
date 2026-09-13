import { JSDOM } from "jsdom";
import { createRoot } from "react-dom/client";
import { createElement, act } from "react";
import LgaWardApp from "./LgaWardApp.jsx";

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
  url: "http://localhost/admin.html"
});
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, "navigator", { value: dom.window.navigator, configurable: true });
global.IS_REACT_ACT_ENVIRONMENT = true;
global.localStorage = {
  store: {},
  getItem(k) {
    return this.store[k] ?? null;
  },
  setItem(k, v) {
    this.store[k] = v;
  },
  removeItem(k) {
    delete this.store[k];
  }
};
global.localStorage.setItem("why_wadada_admin_token", "fake-token-for-test");

const calls = [];
global.fetch = async (url) => {
  calls.push(url);
  if (url.includes("/api/admin/overview")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        stats: { total: 10, today: 1, last7Days: 3, lgasReached: 2 },
        lgaStats: [
          { lga: "Lafia", count: 7 },
          { lga: "Karu", count: 3 }
        ],
        wardStats: [
          { lga: "Lafia", ward: "Shabu", count: 4 },
          { lga: "Lafia", ward: "", count: 2 }
        ],
        recent: []
      })
    };
  }
  throw new Error("Unexpected fetch: " + url);
};

async function flush(times = 5) {
  for (let i = 0; i < times; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
}

async function run() {
  const container = document.getElementById("root");
  const root = createRoot(container);
  await act(async () => {
    root.render(createElement(LgaWardApp));
    await flush();
  });

  const html = container.innerHTML;

  // 1. Both LGA cards rendered, ranked by count (highest first, since the
  // backend already returns lgaStats sorted).
  if (!html.includes("Lafia") || !html.includes("Karu")) throw new Error("FAIL: LGA names not rendered");
  if (!html.includes("RANK 01") || !html.includes("RANK 02")) throw new Error("FAIL: rank labels missing");

  // 2. The top LGA card got the "top" class (border highlight).
  const cards = [...container.querySelectorAll(".lga-card")];
  if (!cards[0]?.classList.contains("top")) throw new Error("FAIL: first LGA card missing 'top' class");
  if (cards[1]?.classList.contains("top")) throw new Error("FAIL: second LGA card should not have 'top' class");

  // 3. Ward cards rendered, including the "Ward not supplied" fallback for
  // a blank ward value.
  if (!html.includes("Shabu")) throw new Error("FAIL: ward name not rendered");
  if (!html.includes("Ward not supplied")) throw new Error("FAIL: blank-ward fallback text missing");

  // 4. Only one endpoint hit — /api/admin/overview, same one the Overview
  // tab already uses. No separate /api/admin/lgas-style call.
  if (!calls.some((c) => c.includes("/api/admin/overview"))) throw new Error("FAIL: overview endpoint not called");
  if (calls.length !== 1) throw new Error("FAIL: expected exactly 1 fetch call, got: " + calls.join(", "));

  console.log("PASS: LgaWardApp renders real LGA/ward data from a single mocked /api/admin/overview call");
  console.log("Calls made:", calls);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
