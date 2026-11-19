import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers";
import { create_flight_resolution } from "../src/pages/games/flight/FlightResolution.js";
import { start_flight_scene } from "../src/pages/games/flight/FlightSceneRuntime.js";
import { flight_scene_layout } from "../src/pages/games/flight/FlightSceneLayout.js";
import {
  create_flight_state,
  INITIAL_FLIGHT_STATE,
} from "../src/pages/games/flight/FlightState.js";

const flush = () => new Promise((resolve) => setImmediate(resolve));
function fixture(options = {}) {
  const frames = new Map(),
    win_events = new Map(),
    doc_events = new Map(),
    requests = [],
    painted = [],
    released = [],
    errors = [];
  let id = 0,
    clock = 0,
    created = 0,
    destroyed = 0,
    cancelled = 0;
  const client = {
    render(state, viewport) {
      return new Promise((resolve, reject) =>
        requests.push({ state, viewport, resolve, reject }),
      );
    },
    release(frame) {
      released.push(frame);
    },
    cancel() {
      cancelled++;
    },
    destroy() {
      destroyed++;
    },
  };
  const window = {
    devicePixelRatio: 1,
    performance: { now: () => clock },
    requestAnimationFrame(callback) {
      frames.set(++id, callback);
      return id;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    addEventListener: (name, callback) => win_events.set(name, callback),
    removeEventListener: (name) => win_events.delete(name),
    ImageData: class {
      constructor(data, width, height) {
        this.data = data;
        this.width = width;
        this.height = height;
      }
    },
  };
  const document = {
    hidden: false,
    addEventListener: (name, callback) => doc_events.set(name, callback),
    removeEventListener: (name) => doc_events.delete(name),
  };
  const canvas = {
    width: 300,
    height: 150,
    getContext: () => ({ putImageData: (image) => painted.push(image) }),
  };
  const store = create_flight_state(INITIAL_FLIGHT_STATE);
  const runtime = start_flight_scene(canvas, store, {
    environment: { window, document },
    create_client: () => {
      created++;
      return client;
    },
    on_error: (error) => errors.push(error),
    ...options,
  });
  return {
    runtime,
    store,
    requests,
    frames,
    win_events,
    doc_events,
    document,
    window,
    canvas,
    painted,
    released,
    errors,
    stats: () => ({ created, destroyed, cancelled }),
    tick() {
      const [key, callback] = frames.entries().next().value;
      frames.delete(key);
      return callback();
    },
    finish(index = requests.length - 1) {
      const request = requests[index];
      clock += 10;
      request.resolve({
        ...request.viewport,
        pixels: new Uint8ClampedArray(
          request.viewport.width_px * request.viewport.height_px * 4,
        ),
        stats: { total_ms: 10 },
      });
    },
  };
}

test("framed cinema uses the inner glass aspect while fixed views retain their specified sizes", async () => {
  const layout = flight_scene_layout(1200, 900, "fill");
  assert.equal(layout.frame_width_px, 1168);
  assert.equal(layout.frame_height_px, 856);
  assert.equal(layout.glass_width_px, 1096);
  assert.equal(layout.glass_height_px, 784);
  const f = fixture();
  f.runtime.resize(layout.glass_width_px, layout.glass_height_px, layout.mode);
  const frame = f.tick();
  const viewport = f.requests[0].viewport;
  assert.ok(
    Math.abs(viewport.width_px / viewport.height_px - 1096 / 784) < 0.02,
  );
  f.finish();
  await frame;
  f.runtime.destroy();
  for (const [mode, height] of [
    ["640x480", 480],
    ["porthole", 640],
  ]) {
    const fixed = flight_scene_layout(390, 500, mode);
    assert.equal(fixed.glass_width_px, 640);
    assert.equal(fixed.glass_height_px, height);
    assert.equal(fixed.frame_width_px, 712);
    assert.equal(fixed.frame_height_px, height + 72);
  }
  assert.equal(flight_scene_layout(0, 900).glass_width_px, 0);
  assert.equal(flight_scene_layout(900, NaN).glass_height_px, 0);
  assert.equal(flight_scene_layout(40, 40).glass_width_px, 1);
  assert.equal(flight_scene_layout(40, 40).glass_height_px, 1);
});

test("resolution preserves aspect, respects display density and adapts with bounded hysteresis", () => {
  const quality = create_flight_resolution();
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
    [1920, 1080],
  ]) {
    const viewport = quality.viewport(width, height, 2);
    assert.ok(viewport.width_px * viewport.height_px <= 57600);
    assert.ok(
      Math.abs(viewport.width_px / viewport.height_px - width / height) < 0.02,
    );
  }
  assert.deepEqual(quality.viewport(10, 10, 2), {
    width_px: 20,
    height_px: 20,
  });
  assert.equal(quality.viewport(0, 20), null);
  quality.observe(100);
  quality.observe(100);
  assert.equal(quality.get_stats().pixel_budget, 57600);
  for (let i = 0; i < 20; i++) quality.observe(100);
  assert.equal(quality.get_stats().pixel_budget, 14400);
  for (let i = 0; i < 500; i++) quality.observe(1);
  assert.equal(quality.get_stats().pixel_budget, 518400);
  assert.throws(() => create_flight_resolution({ max_pixels: 1 }), RangeError);
});

test("scene waits for measurable bounds and schedules only after the prior worker result is painted", async () => {
  const f = fixture();
  assert.equal(f.frames.size, 0);
  assert.equal(f.stats().created, 0);
  f.runtime.resize(1200, 700);
  const running = f.tick();
  assert.equal(f.requests.length, 1);
  assert.equal(f.frames.size, 0);
  assert.equal(f.requests[0].state.airspeed_knots, 0);
  f.store.update({ heading_deg: 90 });
  f.finish();
  await running;
  assert.equal(f.painted.length, 1);
  assert.equal(f.released.length, 1);
  assert.equal(f.frames.size, 1);
  assert.equal(f.canvas.width, f.requests[0].viewport.width_px);
  const next = f.tick();
  assert.equal(f.requests[1].state.heading_deg, 90);
  f.runtime.destroy();
  f.finish();
  await next;
  assert.equal(f.painted.length, 1);
  assert.equal(f.released.length, 2);
  assert.equal(f.frames.size, 0);
});

test("resize/fullscreen invalidates old aspect frames and renders new geometry with the same client", async () => {
  const f = fixture();
  f.runtime.resize(800, 600);
  const first = f.tick();
  f.runtime.resize(1920, 1080);
  f.finish();
  await first;
  assert.equal(f.painted.length, 0);
  assert.equal(f.released.length, 1);
  const second = f.tick();
  const viewport = f.requests[1].viewport;
  assert.ok(Math.abs(viewport.width_px / viewport.height_px - 16 / 9) < 0.02);
  f.finish();
  await second;
  assert.equal(f.stats().created, 1);
  f.runtime.resize(0, 0);
  assert.equal(f.frames.size, 0);
  f.runtime.destroy();
});

test("fixed display keeps exact pixels across resize and switches back using the same client", async () => {
  const f = fixture();
  f.window.devicePixelRatio = 2;
  f.runtime.resize(1200, 800);
  const old = f.tick();
  f.runtime.resize(1200, 800, "640x480");
  f.finish();
  await old;
  assert.equal(f.painted.length, 0);
  for (const [width, height] of [
    [1200, 800],
    [390, 300],
  ]) {
    f.runtime.resize(width, height, "640x480");
    const frame = f.tick();
    assert.deepEqual(f.requests.at(-1).viewport, {
      width_px: 640,
      height_px: 480,
      fisheye_strength: 0,
      haze_percent: 0,
    });
    f.finish();
    await frame;
    assert.equal(f.canvas.width, 640);
    assert.equal(f.canvas.height, 480);
  }
  f.runtime.resize(1200, 800, "fill");
  const restored = f.tick();
  const viewport = f.requests.at(-1).viewport;
  assert.ok(Math.abs(viewport.width_px / viewport.height_px - 1.5) < 0.02);
  f.finish();
  await restored;
  assert.equal(f.stats().created, 1);
  f.runtime.resize(0, 0, "640x480");
  assert.equal(f.frames.size, 0);
  f.runtime.destroy();
});

test("porthole mode uses a 640px square raster and preserves the client through mode and window changes", async () => {
  const f = fixture();
  f.window.devicePixelRatio = 2;
  f.runtime.resize(1200, 800, "640x480", 0.35);
  const cinema = f.tick();
  f.runtime.resize(1200, 800, "porthole", 0.35);
  f.finish();
  await cinema;
  assert.equal(f.painted.length, 0);
  for (const [width, height] of [
    [1200, 800],
    [390, 400],
  ]) {
    f.runtime.resize(width, height, "porthole", 0.35);
    const frame = f.tick();
    assert.deepEqual(f.requests.at(-1).viewport, {
      width_px: 640,
      height_px: 640,
      fisheye_strength: 0.35,
      haze_percent: 0,
    });
    f.finish();
    await frame;
    assert.equal(f.canvas.width, 640);
    assert.equal(f.canvas.height, 640);
  }
  f.runtime.resize(1200, 800, "640x480", 0.35);
  const restored = f.tick();
  assert.equal(f.requests.at(-1).viewport.height_px, 480);
  f.finish();
  await restored;
  assert.equal(f.stats().created, 1);
  f.runtime.destroy();
});

test("changing lenses invalidates old frames without restarting the worker or changing raster size", async () => {
  const f = fixture();
  f.runtime.resize(640, 480, "640x480", 0);
  const old = f.tick();
  f.runtime.resize(640, 480, "640x480", 0.35);
  f.finish();
  await old;
  assert.equal(f.painted.length, 0);
  const lens = f.tick();
  assert.deepEqual(f.requests.at(-1).viewport, {
    width_px: 640,
    height_px: 480,
    fisheye_strength: 0.35,
    haze_percent: 0,
  });
  f.finish();
  await lens;
  assert.equal(f.stats().created, 1);
  f.runtime.destroy();
});

test("haze edits invalidate stale frames and reuse the worker and raster", async () => {
  const f = fixture();
  f.runtime.resize(640, 480, "640x480", 0.35, 25);
  const old = f.tick();
  assert.equal(f.requests[0].viewport.haze_percent, 25);
  f.runtime.resize(640, 480, "640x480", 0.35, 100);
  f.finish();
  await old;
  assert.equal(f.painted.length, 0);
  const fog = f.tick();
  assert.equal(f.requests.at(-1).viewport.haze_percent, 100);
  f.finish();
  await fog;
  assert.equal(f.stats().created, 1);
  assert.equal(f.canvas.width, 640);
  f.runtime.destroy();
});

test("blur, hidden pages and resume cancel stale work without leaking RAFs or listeners", async () => {
  const f = fixture();
  f.runtime.resize(800, 600);
  const first = f.tick();
  f.win_events.get("blur")();
  f.finish();
  await first;
  assert.equal(f.frames.size, 0);
  assert.equal(f.painted.length, 0);
  f.win_events.get("focus")();
  assert.equal(f.frames.size, 1);
  f.document.hidden = true;
  f.doc_events.get("visibilitychange")();
  assert.equal(f.frames.size, 0);
  f.document.hidden = false;
  f.doc_events.get("visibilitychange")();
  const next = f.tick();
  f.finish();
  await next;
  assert.equal(f.painted.length, 1);
  f.runtime.destroy();
  f.runtime.destroy();
  assert.equal(f.stats().destroyed, 1);
  assert.equal(f.win_events.size, 0);
  assert.equal(f.doc_events.size, 0);
  assert.equal(f.frames.size, 0);
});

test("worker and painting failures stop once and allow a fresh runtime to retry", async () => {
  const f = fixture();
  f.runtime.resize(800, 600);
  const first = f.tick();
  f.requests[0].reject(new Error("worker failed"));
  await first;
  assert.equal(f.errors.length, 1);
  assert.equal(f.frames.size, 0);
  assert.equal(f.stats().destroyed, 1);
  f.runtime.destroy();
  const next = fixture();
  next.runtime.resize(800, 600);
  const running = next.tick();
  next.finish();
  await running;
  assert.equal(next.painted.length, 1);
  next.runtime.destroy();
  const unsupported = fixture({
    create_client: () => {
      throw new Error("Worker unavailable");
    },
  });
  unsupported.runtime.resize(800, 600);
  await unsupported.tick();
  assert.equal(unsupported.errors.length, 1);
  unsupported.runtime.destroy();
});

test("aborted work never shows a failure or schedules parallel rendering", async () => {
  const f = fixture();
  f.runtime.resize(800, 600);
  const running = f.tick();
  f.requests[0].reject(Object.assign(new Error(), { name: "AbortError" }));
  await running;
  assert.equal(f.errors.length, 0);
  assert.equal(f.frames.size, 1);
  f.runtime.destroy();
  await flush();
});

test("painting failures release frame storage and dispose the worker exactly once", async () => {
  const f = fixture();
  f.canvas.getContext = () => ({
    putImageData() {
      throw new Error("paint failed");
    },
  });
  f.runtime.resize(800, 600);
  const pending = f.tick();
  f.finish();
  await pending;
  assert.equal(f.errors[0].message, "paint failed");
  assert.equal(f.released.length, 1);
  f.runtime.destroy();
  assert.equal(f.stats().destroyed, 1);
  assert.equal(f.frames.size, 0);
});
