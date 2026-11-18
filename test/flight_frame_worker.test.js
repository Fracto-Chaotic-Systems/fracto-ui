import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { Worker as NodeWorker } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { build, transformSync } from "esbuild";
import express from "express";
import { create_flight_frame_pipeline } from "../src/pages/games/flight/FlightFramePipeline.js";
import { create_flight_worker_runtime } from "../src/pages/games/flight/FlightWorkerRuntime.js";
import { create_flight_frame_session } from "../src/pages/games/flight/FlightFrameSession.js";
import { create_flight_tile_cache } from "../src/pages/games/flight/FlightTileCache.js";
import { create_flight_tile_transport } from "../src/pages/games/flight/FlightTileTransport.js";
import { INITIAL_FLIGHT_STATE } from "../src/pages/games/flight/FlightState.js";
import { DEFAULT_FLIGHT_FRAME_COLORS } from "../src/pages/games/flight/FlightFrameColors.js";

const viewport = { width_px: 3, height_px: 3 };
const down = {
  ...INITIAL_FLIGHT_STATE,
  position_re: -1.9,
  position_im: 1.9,
  altitude_world: 0.001,
  camera_pitch_deg: -90,
};
const sky = { ...down, camera_pitch_deg: 90 };
const tile = (code) => ({
  schema_version: 1,
  source_id: "test",
  short_code: code,
  tile_data: Array.from({ length: 256 }, () => Array(256).fill([2, 10])),
});
const cache_fixture = () =>
  create_flight_tile_cache({
    load_tile: async (code) => tile(code),
    load_availability: async (codes) => ({
      schema_version: 1,
      source_id: "test",
      availability: Object.fromEntries(codes.map((code) => [code, true])),
    }),
  });

test("pipeline progresses from missing samples to tile colors and reuses output across poses and resize", async () => {
  const cache = cache_fixture(),
    pipeline = create_flight_frame_pipeline(cache, {
      refinement_options: { max_level: 3 },
      fallback_options: { max_calculations: 0 },
    });
  const first = pipeline.render(down, viewport);
  assert.equal(first.stats.calculations.unresolved, 9);
  assert.deepEqual(
    [...first.pixels.slice(0, 4)],
    DEFAULT_FLIGHT_FRAME_COLORS.unresolved,
  );
  await pipeline.settled();
  const second = pipeline.render(down, viewport);
  assert.equal(second.stats.calculations.unresolved, 0);
  assert.notDeepEqual(second.pixels, first.pixels);
  const third = pipeline.render(sky, viewport, second.pixels);
  assert.strictEqual(third.pixels, second.pixels);
  assert.deepEqual(
    [...third.pixels.slice(0, 4)],
    DEFAULT_FLIGHT_FRAME_COLORS.sky,
  );
  assert.ok(Number.isFinite(third.stats.total_ms));
  assert.equal(
    pipeline.render(sky, { width_px: 1, height_px: 1 }).pixels.length,
    4,
  );
  pipeline.reset();
  pipeline.destroy();
  pipeline.destroy();
  assert.throws(() => pipeline.render(sky, viewport));
  assert.ok(cache.peek("000"));
  cache.destroy();
});

test("pipeline enforces pixel budgets and resets calculated memoization on source changes", async () => {
  let calls = 0;
  const cache = cache_fixture(),
    pipeline = create_flight_frame_pipeline(cache, {
      max_pixels: 9,
      fallback_options: {
        escape_iterations: 0,
        now: () => 0,
        calculate: () => {
          calls++;
          return { pattern: 0, iteration: 1 };
        },
      },
    });
  const outside = { ...down, position_re: 3 };
  pipeline.render(outside, viewport);
  pipeline.render(outside, viewport);
  assert.equal(calls, 9);
  await cache.load("000");
  pipeline.render(outside, viewport);
  assert.equal(calls, 18);
  assert.throws(
    () => pipeline.render(sky, { width_px: 4, height_px: 4 }),
    /pixel budget/,
  );
  pipeline.destroy();
  cache.destroy();
});

test("worker transport preserves runtime service prefixes, credentials, abort signals and source-aware errors", async () => {
  const calls = [],
    controller = new AbortController();
  const transport = create_flight_tile_transport(
    "https://example.com/api/tiles",
    async (url, options) => {
      calls.push({ url, options });
      return {
        ok: false,
        status: 404,
        json: async () => ({
          error: "TILE_NOT_INDEXED",
          source_id: "release-2",
        }),
      };
    },
  );
  await assert.rejects(
    transport.load_tile("000", { signal: controller.signal }),
    { status: 404, code: "TILE_NOT_INDEXED", source_id: "release-2" },
  );
  await assert.rejects(transport.load_availability(["000", "001"], {}));
  assert.equal(
    calls[0].url,
    "https://example.com/api/tiles/tile?short_code=000",
  );
  assert.equal(calls[0].options.credentials, "include");
  assert.equal(calls[0].options.signal, controller.signal);
  assert.match(calls[1].url, /short_codes=000%2C001/);
  assert.throws(() => create_flight_tile_transport("file:///tmp/tiles"));
});

test("runtime transfers RGBA, bounds recycled buffers, clears them on resize and reports render failures", () => {
  const messages = [];
  const runtime = create_flight_worker_runtime((message, transfer = []) =>
    messages.push(structuredClone(message, { transfer })),
  );
  runtime.receive({
    type: "init",
    tile_service_origin: "https://tiles.example",
    pipeline_options: { max_pixels: 9 },
  });
  assert.equal(messages[0].type, "ready");
  runtime.receive({ type: "render", id: 1, state: sky, viewport });
  const frame = messages[1].frame;
  assert.equal(frame.pixels.length, 36);
  runtime.receive({ type: "recycle", pixels: frame.pixels });
  runtime.receive({ type: "recycle", pixels: new Uint8ClampedArray(36) });
  runtime.receive({ type: "recycle", pixels: new Uint8ClampedArray(36) });
  assert.equal(runtime.get_stats().recycled_buffers, 2);
  runtime.receive({ type: "render", id: 2, state: sky, viewport });
  assert.equal(runtime.get_stats().recycled_buffers, 1);
  runtime.receive({
    type: "render",
    id: 3,
    state: sky,
    viewport: { width_px: 1, height_px: 1 },
  });
  assert.equal(runtime.get_stats().recycled_buffers, 0);
  runtime.receive({
    type: "render",
    id: 4,
    state: sky,
    viewport: { width_px: 4, height_px: 4 },
  });
  assert.equal(messages.at(-1).type, "error");
  assert.equal(messages.at(-1).id, 4);
  runtime.receive({ type: "reset" });
  runtime.destroy();
  assert.equal(runtime.get_stats().initialized, false);
});

function worker_fixture() {
  const messages = [],
    handlers = new Map();
  const worker = {
    terminated: false,
    postMessage(message, transfer = []) {
      messages.push(structuredClone(message, { transfer }));
    },
    addEventListener(name, callback) {
      handlers.set(name, callback);
    },
    removeEventListener(name) {
      handlers.delete(name);
    },
    terminate() {
      this.terminated = true;
    },
  };
  const session = create_flight_frame_session(worker, {
    tile_service_origin: "https://tiles.example",
  });
  const emit = (data) => handlers.get("message")?.({ data });
  const result = (id, size = 1) => ({
    type: "frame",
    id,
    frame: {
      width_px: size,
      height_px: size,
      pixels: new Uint8ClampedArray(size * size * 4),
    },
  });
  return { messages, handlers, worker, session, emit, result };
}

test("session keeps one active/latest queued view, rejects obsolete frames and recycles transferred storage", async () => {
  const { session, messages, emit, result } = worker_fixture();
  const size = { width_px: 1, height_px: 1 };
  const a = assert.rejects(session.render(sky, size), { name: "AbortError" });
  const b = assert.rejects(session.render(sky, size), { name: "AbortError" });
  const c = session.render(sky, size);
  await Promise.all([a, b]);
  assert.equal(
    messages.filter((message) => message.type === "render").length,
    1,
  );
  emit(result(1));
  assert.ok(messages.some((message) => message.type === "recycle"));
  assert.equal(
    messages.filter((message) => message.type === "render").at(-1).id,
    3,
  );
  const current = result(3);
  emit(current);
  const frame = await c;
  assert.equal(frame.pixels.byteLength, 4);
  assert.equal(session.release(frame), true);
  assert.equal(frame.pixels.byteLength, 0);
  assert.equal(session.release(frame), false);
  session.destroy();
});

test("cancel, render errors and worker failures settle promises and cleanup terminates the worker", async () => {
  const f = worker_fixture(),
    size = { width_px: 1, height_px: 1 };
  const a = assert.rejects(f.session.render(sky, size), { name: "AbortError" });
  f.session.cancel();
  await a;
  assert.equal(f.messages.at(-1).type, "reset");
  const b = f.session.render(sky, size);
  f.emit(f.result(1));
  f.emit({ type: "error", id: 3, error: { message: "bad frame" } });
  await assert.rejects(b, /bad frame/);
  const c = assert.rejects(f.session.render(sky, size), /crashed/);
  f.handlers.get("error")({ message: "crashed" });
  await c;
  assert.equal(f.worker.terminated, true);
  assert.equal(f.handlers.size, 0);
  await assert.rejects(f.session.render(sky, size), /destroyed/);
  f.session.destroy();
});

test("invalid new arguments do not invalidate an existing request, and malformed worker frames fail closed", async () => {
  const f = worker_fixture(),
    size = { width_px: 1, height_px: 1 };
  const a = f.session.render(sky, size);
  await assert.rejects(f.session.render(sky, size, { sky: () => {} }));
  f.emit(f.result(1));
  f.session.release(await a);
  const b = assert.rejects(
    f.session.render(sky, size),
    /Invalid flight worker frame/,
  );
  f.emit(f.result(2, 2));
  await b;
  assert.equal(f.worker.terminated, true);
});

test("production factory discovers the tile origin on the UI thread and passes serializable budgets to its worker", () => {
  const f = worker_fixture();
  f.session.destroy();
  f.worker.terminated = false;
  const source = readFileSync(
    new URL("../src/pages/games/flight/FlightFrameClient.js", import.meta.url),
    "utf8",
  );
  const { code } = transformSync(source, {
    format: "cjs",
    define: { "import.meta.url": JSON.stringify(import.meta.url) },
  });
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    URL,
    require: (name) =>
      name.endsWith("service_origin.jsx")
        ? {
            service_origin: (name) => {
              assert.equal(name, "tiles");
              return "https://example.com/api/tiles";
            },
          }
        : { create_flight_frame_session },
  });
  const session = module.exports.create_flight_frame_client({
    worker_factory: () => f.worker,
    pipeline_options: { max_pixels: 100 },
  });
  assert.equal(
    f.messages.at(-1).tile_service_origin,
    "https://example.com/api/tiles",
  );
  assert.equal(f.messages.at(-1).pipeline_options.max_pixels, 100);
  session.destroy();
});

test(
  "bundled production worker traces, fetches numerical tiles and colors through a real worker boundary",
  { timeout: 20000 },
  async (t) => {
    const requests = [],
      app = express();
    app.get("/tile_availability", (req, res) => {
      requests.push("availability");
      res.json({
        schema_version: 1,
        source_id: "test",
        availability: Object.fromEntries(
          req.query.short_codes.split(",").map((code) => [code, true]),
        ),
      });
    });
    app.get("/tile", (req, res) => {
      requests.push("tile");
      res.json(tile(req.query.short_code));
    });
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const bundle = await build({
      entryPoints: [
        fileURLToPath(
          new URL(
            "../src/pages/games/flight/FlightFrame.worker.js",
            import.meta.url,
          ),
        ),
      ],
      bundle: true,
      write: false,
      platform: "browser",
      format: "cjs",
      target: "es2022",
    });
    const shim =
      'const { parentPort } = require("node:worker_threads"); globalThis.self = { postMessage: (message, transfer) => parentPort.postMessage(message, transfer) }; parentPort.on("message", data => self.onmessage({ data }));\n';
    const worker = new NodeWorker(shim + bundle.outputFiles[0].text, {
      eval: true,
    });
    t.after(() => worker.terminate());
    let response = once(worker, "message");
    worker.postMessage({
      type: "init",
      tile_service_origin: `http://127.0.0.1:${server.address().port}`,
      pipeline_options: {
        refinement_options: { max_level: 3 },
        fallback_options: { max_calculations: 0 },
      },
    });
    assert.equal((await response)[0].type, "ready");
    let frame;
    for (let id = 1; id < 30; id++) {
      response = once(worker, "message");
      worker.postMessage({ type: "render", id, state: down, viewport });
      const message = (await response)[0];
      assert.equal(message.type, "frame");
      frame = message.frame;
      if (frame.stats.cache.tiles > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(frame.stats.calculations.unresolved, 0);
    assert.ok(requests.includes("tile"));
    assert.equal(frame.pixels.length, 36);
    assert.notDeepEqual(
      [...frame.pixels.slice(0, 4)],
      DEFAULT_FLIGHT_FRAME_COLORS.unresolved,
    );
    worker.postMessage({ type: "recycle", pixels: frame.pixels }, [
      frame.pixels.buffer,
    ]);
    assert.equal(frame.pixels.byteLength, 0);
  },
);
