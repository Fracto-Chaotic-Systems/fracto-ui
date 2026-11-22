import assert from "node:assert/strict";
import test from "node:test";
import { fetch_inventory_assets } from "../src/pages/games/InventoryAssetRequest.js";

test("category request retains session and returns all grass entries", async () => {
  const assets = ["grass-patch-001", "grasses-2", "grasses3"].map((id) => ({
    id,
  }));
  const result = await fetch_inventory_assets(
    "/api/environment-catalog?category=material",
    {
      request: async (url, options) => {
        assert.equal(url, "/api/environment-catalog?category=material");
        assert.equal(options.credentials, "include");
        assert.equal(options.cache, "no-store");
        assert.ok(options.signal);
        return new Response(JSON.stringify({ assets }));
      },
    },
  );
  assert.deepEqual(result, assets);
});

const wait_for_abort = (signal) =>
  new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => reject(signal.reason), {
      once: true,
    });
  });

test("a stalled catalog request times out instead of loading indefinitely", async () => {
  // AbortSignal timeout timers are unref'd; keep this isolated test alive.
  const hold = setInterval(() => {}, 1000);
  try {
    await assert.rejects(
      fetch_inventory_assets("/catalog", {
        timeout_ms: 10,
        request: async (url, { signal }) => wait_for_abort(signal),
      }),
      { name: "TimeoutError" },
    );
  } finally {
    clearInterval(hold);
  }
});

test("the deadline also covers a stalled response body", async () => {
  const hold = setInterval(() => {}, 1000);
  try {
    await assert.rejects(
      fetch_inventory_assets("/catalog", {
        timeout_ms: 10,
        request: async (url, { signal }) => ({
          ok: true,
          json: () => wait_for_abort(signal),
        }),
      }),
      { name: "TimeoutError" },
    );
  } finally {
    clearInterval(hold);
  }
});

test("navigation abort remains distinct from a timeout", async () => {
  const controller = new AbortController();
  const pending = fetch_inventory_assets("/catalog", {
    signal: controller.signal,
    request: async (url, { signal }) => wait_for_abort(signal),
  });
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
});

test("HTTP failures and malformed lists are rejected instead of treated as empty", async () => {
  for (const response of [
    new Response("unavailable", { status: 503 }),
    new Response("{}"),
  ]) {
    await assert.rejects(
      fetch_inventory_assets("/catalog", { request: async () => response }),
      /catalog_unavailable/,
    );
  }
});
