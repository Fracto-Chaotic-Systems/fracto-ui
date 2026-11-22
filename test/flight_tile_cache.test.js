import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { setImmediate } from "node:timers";
import { transformSync } from "esbuild";
import {
  create_flight_tile_cache,
  FLIGHT_TILE_BYTES,
} from "@fracto/sdk/flight/TileCache.js";

const data = Array.from({ length: 256 }, (_, i) =>
  Array.from({ length: 256 }, (_, j) => [i - j, j * 1000 + i]),
);
const payload = (code, source_id = "release-1") => ({
  schema_version: 1,
  short_code: code,
  source_id,
  tile_data: data,
});
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const flush = () => new Promise((resolve) => setImmediate(resolve));
function cache(options = {}) {
  return create_flight_tile_cache({
    load_tile: async (code) => payload(code),
    load_availability: async (codes) => ({
      schema_version: 1,
      source_id: "release-1",
      availability: Object.fromEntries(
        codes.map((code) => [code, code !== "001"]),
      ),
    }),
    ...options,
  });
}

test("deduplicates tile requests and decodes signed column-major pairs into row-major doubles", async () => {
  const done = deferred();
  let loads = 0;
  const store = cache({
    load_tile: () => {
      loads++;
      return done.promise;
    },
  });
  const first = store.load("000"),
    second = store.load("000");
  assert.equal(loads, 1);
  done.resolve(payload("000"));
  const [a, b] = await Promise.all([first, second]);
  assert.strictEqual(a, b);
  assert.equal(a.values[(20 * 256 + 3) * 2], -17);
  assert.equal(a.values[(20 * 256 + 3) * 2 + 1], 20003);
  assert.strictEqual(await store.load("000"), a);
  assert.strictEqual(store.peek("000"), a);
  assert.equal(store.get_stats().bytes, FLIGHT_TILE_BYTES);
  assert.equal(loads, 1);
});

test("both byte and tile-count budgets evict least recently used decoded tiles", async () => {
  for (const limits of [
    { max_tiles: 2 },
    { max_bytes: 2 * FLIGHT_TILE_BYTES },
  ]) {
    const store = cache(limits);
    await store.load("000");
    await store.load("001");
    store.peek("000");
    await store.load("002");
    assert.equal(store.peek("001"), null);
    assert.ok(store.peek("000"));
    assert.ok(store.peek("002"));
    assert.equal(store.get_stats().tiles, 2);
  }
});

test("pinning protects active frame tiles without exceeding budgets, and unpinning restores eviction", async () => {
  const store = cache({ max_tiles: 2 });
  await store.load("000");
  await store.load("001");
  store.pin(["000"]);
  await store.load("002");
  assert.equal(store.peek("001"), null);
  assert.ok(store.peek("000"));
  store.pin(["000", "002"]);
  await assert.rejects(store.load("003"), { code: "FLIGHT_TILE_CACHE_BUDGET" });
  assert.equal(store.get_stats().tiles, 2);
  assert.equal(store.get_stats().pinned, 2);
  store.pin([]);
  await store.load("003");
  assert.equal(store.get_stats().tiles, 2);
  store.clear();
  assert.equal(store.get_stats().pinned, 0);
});

test("bounded availability batches deduplicate, skip missing tiles and expire negative entries", async () => {
  let clock = 0,
    checks = 0,
    loads = 0;
  const store = cache({
    now: () => clock,
    availability_ttl_ms: 10,
    max_availability: 2,
    load_tile: async (code) => {
      loads++;
      return payload(code);
    },
    load_availability: async (codes) => {
      checks++;
      return {
        schema_version: 1,
        source_id: "release-1",
        availability: Object.fromEntries(
          codes.map((code) => [code, code !== "001"]),
        ),
      };
    },
  });
  const [a, b] = await Promise.all([
    store.availability(["001", "000", "000"]),
    store.availability(["000", "001"]),
  ]);
  assert.deepEqual(a, { "000": true, "001": false });
  assert.deepEqual(a, b);
  assert.equal(checks, 1);
  assert.equal(await store.load("001"), null);
  assert.equal(loads, 0);
  clock = 11;
  assert.ok(await store.load("001"));
  assert.equal(loads, 1);
  await store.availability(["002", "003"]);
  assert.ok(store.get_stats().availability <= 2);
  assert.deepEqual(await store.availability([]), {});
  await assert.rejects(store.availability(Array(257).fill("000")), RangeError);
});

test("cancelling one consumer preserves a shared request for another consumer", async () => {
  const done = deferred(),
    caller = new AbortController();
  let network_signal;
  const store = cache({
    load_tile: (code, { signal }) => {
      network_signal = signal;
      return done.promise;
    },
  });
  const first = store.load("000", { signal: caller.signal });
  const cancelled = assert.rejects(first, { name: "AbortError" });
  const second = store.load("000");
  caller.abort();
  await cancelled;
  assert.equal(network_signal.aborted, false);
  done.resolve(payload("000"));
  assert.ok(await second);
});

test("concurrency and queue limits bound requests; queued cancellation never starts transport", async () => {
  const done = deferred(),
    queued = new AbortController(),
    calls = [];
  const store = cache({
    concurrency: 1,
    max_pending: 2,
    load_tile: (code) => {
      calls.push(code);
      return done.promise;
    },
  });
  const first = store.load("000"),
    second = store.load("001", { signal: queued.signal });
  const cancelled = assert.rejects(second, { name: "AbortError" });
  await assert.rejects(store.load("002"), { code: "FLIGHT_TILE_QUEUE_FULL" });
  queued.abort();
  await cancelled;
  done.resolve(payload("000"));
  await first;
  assert.deepEqual(calls, ["000"]);
  assert.equal(store.get_stats().active, 0);
});

test("retain aborts obsolete frames and late completions cannot repopulate the cache", async () => {
  const done = deferred();
  let signal;
  const store = cache({
    load_tile: (code, options) => {
      signal = options.signal;
      return done.promise;
    },
  });
  const old = store.load("000");
  const cancelled = assert.rejects(old, { name: "AbortError" });
  store.retain(["001"]);
  await cancelled;
  assert.equal(signal.aborted, true);
  done.resolve(payload("000"));
  await flush();
  assert.equal(store.peek("000"), null);
  assert.equal(store.get_stats().pending, 0);
});

test("clear cancels queued/active work; detached destroy is idempotent and permanent", async () => {
  const tasks = [];
  const store = cache({
    concurrency: 1,
    load_tile: () => {
      const task = deferred();
      tasks.push(task);
      return task.promise;
    },
  });
  const a = assert.rejects(store.load("000"), { name: "AbortError" });
  const b = assert.rejects(store.load("001"), { name: "AbortError" });
  store.clear();
  await Promise.all([a, b]);
  tasks[0].resolve(payload("000"));
  await flush();
  const next = store.load("002");
  tasks[1].resolve(payload("002"));
  await next;
  const destroy = store.destroy;
  destroy();
  destroy();
  assert.equal(store.get_stats().bytes, 0);
  await assert.rejects(store.load("002"), { code: "FLIGHT_CACHE_DESTROYED" });
  await assert.rejects(store.availability(["002"]), {
    code: "FLIGHT_CACHE_DESTROYED",
  });
});

test("source changes invalidate decoded data and cancel stale generation requests", async () => {
  const stale = deferred();
  const store = cache({
    load_tile: (code) =>
      code === "002"
        ? stale.promise
        : Promise.resolve(
            payload(code, code === "000" ? "release-1" : "release-2"),
          ),
  });
  await store.load("000");
  const old = assert.rejects(store.load("002"), { name: "AbortError" });
  await assert.rejects(store.load("001"), { code: "TILE_SOURCE_CHANGED" });
  await old;
  assert.equal(store.peek("000"), null);
  stale.resolve(payload("002"));
  await flush();
  assert.equal(store.peek("002"), null);
  assert.equal((await store.load("001")).source_id, "release-2");
});

test("only authoritative 404 misses are cached; transient failures and malformed data remain retryable", async () => {
  let clock = 0,
    count = 0;
  const store = cache({
    now: () => clock,
    availability_ttl_ms: 10,
    load_tile: async (code) => {
      count++;
      if (count === 1)
        throw Object.assign(new Error(), {
          status: 503,
          code: "TILE_UNAVAILABLE",
        });
      if (count === 2)
        throw Object.assign(new Error(), {
          status: 404,
          code: "TILE_NOT_INDEXED",
          source_id: "release-1",
        });
      return payload(code);
    },
  });
  await assert.rejects(store.load("000"), { status: 503 });
  assert.equal(await store.load("000"), null);
  assert.equal(await store.load("000"), null);
  assert.equal(count, 2);
  clock = 11;
  assert.ok(await store.load("000"));
  for (const response of [
    { ...payload("001"), tile_data: [[0, 1]] },
    payload("002"),
    { ...payload("001"), schema_version: 7 },
    { ...payload("001"), source_id: null },
  ]) {
    const broken = cache({ load_tile: async () => response });
    await assert.rejects(broken.load("001"));
    assert.equal(broken.get_stats().tiles, 0);
  }
});

test("null samples remain explicitly unresolved and invalid codes never call transport", async () => {
  const sparse = data.map((column) => [...column]);
  sparse[0][0] = null;
  const store = cache({
    load_tile: async (code) => ({ ...payload(code), tile_data: sparse }),
  });
  const tile = await store.load("000");
  assert.ok(Number.isNaN(tile.values[0]));
  assert.ok(Number.isNaN(tile.values[1]));
  await assert.rejects(store.load("../000"), RangeError);
  const caller = new AbortController();
  caller.abort();
  await assert.rejects(store.load("000", { signal: caller.signal }), {
    name: "AbortError",
  });
  const broken = cache({
    load_availability: async () => ({
      schema_version: 1,
      source_id: "release-1",
      availability: {},
    }),
  });
  await assert.rejects(broken.availability(["000"]), {
    code: "INVALID_TILE_AVAILABILITY",
  });
  assert.equal(broken.get_stats().availability, 0);
});

test("production client routes through TilesBackend with credentials, cancellation and source-aware errors", async () => {
  const requests = [];
  const fetch = async (url, options) => {
    requests.push({ url, options });
    const parsed = new URL(url);
    if (parsed.pathname === "/tile_availability")
      return {
        ok: true,
        json: async () => ({
          schema_version: 1,
          source_id: "release-1",
          availability: { "000": true, "001": false },
        }),
      };
    const code = parsed.searchParams.get("short_code");
    if (code === "002")
      return {
        ok: false,
        status: 404,
        json: async () => ({
          error: "TILE_NOT_INDEXED",
          source_id: "release-1",
        }),
      };
    return { ok: true, json: async () => payload(code) };
  };
  const load = (relative, imports) => {
    const source = readFileSync(new URL(relative, import.meta.url), "utf8");
    const { code } = transformSync(source, {
      format: "cjs",
      loader: "jsx",
      define: { "import.meta.env": "{}" },
    });
    const module = { exports: {} };
    vm.runInNewContext(code, {
      module,
      exports: module.exports,
      URLSearchParams,
      fetch,
      console,
      require: (name) => {
        assert.ok(name in imports, name);
        return imports[name];
      },
    });
    return module.exports;
  };
  const utils = load("../src/backend/BackendUtils.jsx", {});
  const backend = load("../src/backend/TilesBackend.jsx", {
    axios: {},
    "../utils/service_origin.jsx": {
      service_origin: () => "https://tiles.example",
    },
    "./BackendUtils.jsx": utils,
  });
  const client = load("../src/pages/games/flight/FlightTileClient.js", {
    "../../../backend/TilesBackend.jsx": backend,
    "@fracto/sdk/flight/TileCache.js": { create_flight_tile_cache },
  }).create_flight_tile_client();
  await client.availability(["000", "001"]);
  const controller = new AbortController();
  assert.ok(await client.load("000", { signal: controller.signal }));
  assert.equal(await client.load("001"), null);
  assert.equal(await client.load("002"), null);
  assert.equal(requests.length, 3);
  assert.equal(
    requests[0].url,
    "https://tiles.example/tile_availability?short_codes=000%2C001",
  );
  assert.equal(requests[1].url, "https://tiles.example/tile?short_code=000");
  assert.ok(
    requests.every((request) => request.options.credentials === "include"),
  );
  assert.ok(
    requests.every((request) => request.options.signal instanceof AbortSignal),
  );
  client.destroy();
});
