import { JSDOM } from "jsdom";
import { createRoot } from "react-dom/client";
import { createElement, act } from "react";
import SupportersApp from "./SupportersApp.jsx";

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
  if (url.includes("/api/admin/me")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, admin: { email: "a@b.com", role: "super_admin", lga: null } })
    };
  }
  if (url.includes("/api/lgas")) {
    return { ok: true, status: 200, json: async () => ({ success: true, data: ["Lafia", "Karu"] }) };
  }
  if (url.includes("/api/admin/supporters")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [
          { _id: "1", name: "Aisha Bello", phone: "+2348012345678", lga: "Lafia", ward: "Shabu", createdAt: "2026-08-01T00:00:00.000Z" }
        ],
        pagination: { page: 1, limit: 25, total: 1, pages: 1 }
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
    root.render(createElement(SupportersApp));
    await flush();
  });

  const html = container.innerHTML;

  // 1. The table actually rendered the mocked supporter.
  if (!html.includes("Aisha Bello")) throw new Error("FAIL: supporter name not rendered");
  if (!html.includes("+2348012345678")) throw new Error("FAIL: phone not rendered");
  if (!html.includes("Shabu")) throw new Error("FAIL: ward not rendered");

  // 2. Pagination summary reflects the mocked totals.
  if (!html.includes("Page 1 of 1") || !html.includes("1 records"))
    throw new Error("FAIL: pagination summary incorrect: " + html);

  // 3. LGA filter populated from /api/lgas (not just the fallback list).
  if (!html.includes("Lafia") || !html.includes("Karu")) throw new Error("FAIL: LGA options missing");

  // 4. It actually called all three expected endpoints.
  const hitMe = calls.some((c) => c.includes("/api/admin/me"));
  const hitLgas = calls.some((c) => c.includes("/api/lgas"));
  const hitSupporters = calls.some((c) => c.includes("/api/admin/supporters"));
  if (!hitMe || !hitLgas || !hitSupporters) throw new Error("FAIL: missing expected fetch calls: " + calls.join(", "));

  console.log("PASS: SupportersApp renders real data from mocked API calls");
  console.log("Calls made:", calls);
}

async function runScopedCoordinator() {
  calls.length = 0;
  global.fetch = async (url) => {
    calls.push(url);
    if (url.includes("/api/admin/me")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, admin: { email: "coord@b.com", role: "lga_coordinator", lga: "Karu" } })
      };
    }
    if (url.includes("/api/lgas")) {
      return { ok: true, status: 200, json: async () => ({ success: true, data: ["Lafia", "Karu"] }) };
    }
    if (url.includes("/api/admin/supporters")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: [], pagination: { page: 1, limit: 25, total: 0, pages: 1 } })
      };
    }
    throw new Error("Unexpected fetch: " + url);
  };

  const container2 = document.createElement("div");
  document.body.appendChild(container2);
  const root2 = createRoot(container2);
  await act(async () => {
    root2.render(createElement(SupportersApp));
    await flush();
  });

  // An LGA coordinator's filter must be locked to their own LGA — same
  // rule admin.js enforced for the vanilla <select disabled> version.
  const select = container2.querySelector("select");
  if (!select) throw new Error("FAIL: no <select> rendered");
  if (select.value !== "Karu") throw new Error("FAIL: filter not locked to coordinator's LGA, got: " + select.value);
  if (!select.disabled) throw new Error("FAIL: filter should be disabled for a scoped coordinator");

  const supportersCall = calls.find((c) => c.includes("/api/admin/supporters"));
  if (!supportersCall.includes("lga=Karu")) throw new Error("FAIL: supporters request did not include lga=Karu: " + supportersCall);

  console.log("PASS: LGA coordinator's filter is locked to their own LGA and the query is scoped");
}

run()
  .then(runScopedCoordinator)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
