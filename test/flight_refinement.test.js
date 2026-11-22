import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers";
import { create_flight_tile_cache } from "@fracto/sdk/flight/TileCache.js";
import {
  create_flight_refinement,
  create_flight_sample_buffer,
} from "../src/pages/games/flight/FlightRefinement.js";
import {
  create_flight_intersections,
  FLIGHT_RAY_PLANE,
  FLIGHT_RAY_SKY,
  create_flight_projection,
  trace_flight_frame,
} from "../src/pages/games/flight/FlightProjection.js";
import { INITIAL_FLIGHT_STATE } from "../src/pages/games/flight/FlightState.js";

const points = (coordinates) => {
  const frame = create_flight_intersections(coordinates.length, 1);
  coordinates.forEach(([re, im], pixel) => {
    frame.kinds[pixel] = FLIGHT_RAY_PLANE;
    frame.position_re[pixel] = re;
    frame.position_im[pixel] = im;
  });
  return frame;
};
const close_points = points([
  [-1.9, 1.9],
  [-1.8997, 1.9],
]);
const payload = (code, source_id = "source-1", empty = false) => ({
  schema_version: 1,
  short_code: code,
  source_id,
  tile_data: Array.from({ length: 256 }, () =>
    Array(256).fill(empty ? null : [code.length, -code.length * 10]),
  ),
});
function fixture({
  cache_options = {},
  engine_options = {},
  available = () => true,
  load,
} = {}) {
  const loads = [],
    checks = [];
  const cache = create_flight_tile_cache({
    load_tile: async (code, options) => {
      loads.push(code);
      return load ? load(code, options) : payload(code);
    },
    load_availability: async (codes) => {
      checks.push([...codes]);
      return {
        schema_version: 1,
        source_id: "source-1",
        availability: Object.fromEntries(
          codes.map((code) => [code, available(code)]),
        ),
      };
    },
    ...cache_options,
  });
  const engine = create_flight_refinement(cache, engine_options);
  return { cache, engine, loads, checks };
}

test("cold views load only visible level-three roots and leave non-plane pixels untouched", async () => {
  const { engine, loads } = fixture();
  const view = points([
    [-1.9, 1.9],
    [-1.6, 1.6],
    [3, 0],
    [0, 0],
  ]);
  view.kinds[3] = FLIGHT_RAY_SKY;
  const first = engine.sample(view);
  assert.equal(first.unresolved_count, 3);
  assert.ok(first.values.every(Number.isNaN));
  await engine.settled();
  assert.deepEqual(loads, ["000"]);
  const next = engine.sample(view);
  assert.deepEqual([...next.levels], [3, 3, 0, 0]);
  assert.equal(next.unresolved_count, 1);
  assert.equal(next.duplicate_count, 0);
  assert.equal(engine.get_stats().pending, 0);
});

test("only repeated sample regions refine; parent values remain until child load and future frames reuse detail", async () => {
  const { cache, engine, loads } = fixture();
  await cache.load("000");
  loads.length = 0;
  const view = points([
    [-1.9, 1.9],
    [-1.8997, 1.9],
    [-1.6, 1.6],
  ]);
  const coarse = engine.sample(view);
  assert.deepEqual([...coarse.levels], [3, 3, 3]);
  assert.equal(coarse.duplicate_count, 2);
  await engine.settled();
  assert.deepEqual(loads, ["0000"]);
  assert.deepEqual([...coarse.values], [3, -30, 3, -30, 3, -30]);
  const fine = engine.sample(view);
  assert.deepEqual([...fine.levels], [4, 4, 3]);
  assert.equal(fine.duplicate_count, 0);
  assert.deepEqual([...fine.values], [4, -40, 4, -40, 3, -30]);
  await engine.settled();
  assert.deepEqual(loads, ["0000"]);
  engine.sample(points([[-1.9, 1.9]]));
  await engine.settled();
  assert.equal(loads.length, 1);
});

test("collisions across a child boundary refine both involved children without loading siblings", async () => {
  const { cache, engine, loads, checks } = fixture();
  await cache.load("000");
  loads.length = 0;
  const view = points([
    [-1.7501, 1.9],
    [-1.7499, 1.9],
  ]);
  assert.equal(engine.sample(view).duplicate_count, 2);
  await engine.settled();
  assert.deepEqual(loads.sort(), ["0000", "0001"]);
  assert.deepEqual(checks[0].sort(), ["0000", "0001"]);
  assert.deepEqual([...engine.sample(view).levels], [4, 4]);
});

test("identity includes tile and sample indices, not equal pattern/iteration values", async () => {
  const { cache, engine, loads } = fixture();
  await cache.load("000");
  await cache.load("001");
  loads.length = 0;
  const frame = engine.sample(
    points([
      [-1.9, 1.9],
      [-1.8, 1.9],
      [-1.4, 1.9],
    ]),
  );
  assert.equal(frame.duplicate_count, 0);
  await engine.settled();
  assert.deepEqual(loads, []);
  const terminal = create_flight_refinement(cache, { max_level: 3 });
  const repeated = terminal.sample(
    points([
      [-1.9, 1.9],
      [-1.9, 1.9],
      [-1.9, 1.9],
      [-1.8, 1.9],
    ]),
  );
  assert.equal(repeated.duplicate_count, 3);
  assert.equal(repeated.max_depth_duplicate_count, 3);
  terminal.destroy();
});

test("unavailable and sparse children keep parent samples, with bounded retries", async () => {
  let clock = 0;
  const { cache, engine, loads, checks } = fixture({
    available: (code) => code.length === 3,
    engine_options: { now: () => clock },
    cache_options: { now: () => clock },
  });
  await cache.load("000");
  engine.sample(close_points);
  await engine.settled();
  assert.deepEqual([...engine.sample(close_points).levels], [3, 3]);
  assert.equal(checks.length, 1);
  assert.deepEqual(loads, ["000"]);
  clock = 6000;
  engine.sample(close_points);
  await engine.settled();
  assert.equal(checks.length, 2);
  const sparse = fixture({
    load: (code) => payload(code, "source-1", code.length > 3),
  });
  await sparse.cache.load("000");
  sparse.engine.sample(close_points);
  await sparse.engine.settled();
  assert.deepEqual([...sparse.engine.sample(close_points).levels], [3, 3]);
});

test("transient child failures are reported, retain the parent and retry successfully", async () => {
  let clock = 0,
    fail = true;
  const { cache, engine } = fixture({
    engine_options: { now: () => clock },
    load: (code) => {
      if (code.length > 3 && fail)
        throw Object.assign(new Error(), { code: "TILE_UNAVAILABLE" });
      return payload(code);
    },
  });
  await cache.load("000");
  engine.sample(close_points);
  await engine.settled();
  assert.equal(engine.get_stats().last_error.code, "TILE_UNAVAILABLE");
  assert.deepEqual([...engine.sample(close_points).levels], [3, 3]);
  fail = false;
  clock = 1001;
  engine.sample(close_points);
  await engine.settled();
  assert.deepEqual([...engine.sample(close_points).levels], [4, 4]);
});

test("maximum-depth duplicates, including mirrored pixels, are valid terminal results", async () => {
  const { engine, loads } = fixture();
  const view = points([
    [-1.9, 1.9],
    [-1.9, -1.9],
  ]);
  let result;
  for (let pass = 0; pass < 33; pass++) {
    result = engine.sample(view);
    await engine.settled();
  }
  assert.deepEqual([...result.levels], [34, 34]);
  assert.equal(result.max_depth_duplicate_count, 2);
  assert.equal(engine.get_stats().pending, 0);
  assert.equal(loads.length, 32);
  assert.ok(loads.every((code) => code.length <= 34));
});

test("cache pressure preserves pinned parents and stops refinement within the memory budget", async () => {
  const { cache, engine, loads } = fixture({ cache_options: { max_tiles: 1 } });
  await cache.load("000");
  engine.sample(close_points);
  await engine.settled();
  assert.equal(engine.get_stats().last_error.code, "FLIGHT_TILE_CACHE_BUDGET");
  assert.ok(cache.peek("000"));
  assert.equal(cache.get_stats().tiles, 1);
  assert.deepEqual(loads, ["000"]);
  assert.deepEqual([...engine.sample(close_points).levels], [3, 3]);
});

test("new views cancel obsolete child work and late responses cannot alter frames or cache", async () => {
  let finish, signal;
  const { cache, engine } = fixture({
    load: (code, options) =>
      code.length === 3
        ? payload(code)
        : new Promise((resolve) => {
            finish = resolve;
            signal = options.signal;
          }),
  });
  await cache.load("000");
  const frame = engine.sample(close_points);
  await new Promise((resolve) => setImmediate(resolve));
  const sky = points([[0, 0]]);
  sky.kinds[0] = FLIGHT_RAY_SKY;
  engine.sample(sky);
  assert.equal(signal.aborted, true);
  finish(payload("0000"));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(cache.peek("0000"), null);
  assert.deepEqual([...frame.levels], [3, 3]);
  assert.equal(engine.get_stats().pending, 0);
});

test("source changes discard remembered refinement paths and begin again at the roots", async () => {
  let source = "source-1";
  const { cache, engine } = fixture({
    load: (code) => payload(code, source),
    cache_options: {
      load_availability: async (codes) => ({
        schema_version: 1,
        source_id: source,
        availability: Object.fromEntries(codes.map((code) => [code, true])),
      }),
    },
  });
  await cache.load("000");
  engine.sample(close_points);
  await engine.settled();
  assert.equal(engine.sample(close_points).levels[0], 4);
  source = "source-2";
  await assert.rejects(cache.load("001"), { code: "TILE_SOURCE_CHANGED" });
  const first = engine.sample(close_points);
  assert.equal(first.levels[0], 0);
  await engine.settled();
  assert.equal(engine.sample(close_points).levels[0], 3);
  await engine.settled();
});

test("cancelling one child keeps a shared availability batch alive for a retained child", async () => {
  let finish, batch_signal;
  const { cache, engine, loads } = fixture({
    cache_options: {
      load_availability: (codes, options) =>
        new Promise((resolve) => {
          finish = () =>
            resolve({
              schema_version: 1,
              source_id: "source-1",
              availability: Object.fromEntries(
                codes.map((code) => [code, true]),
              ),
            });
          batch_signal = options.signal;
        }),
    },
  });
  await cache.load("000");
  loads.length = 0;
  engine.sample(
    points([
      [-1.7501, 1.9],
      [-1.7499, 1.9],
    ]),
  );
  engine.sample(points([[-1.7501, 1.9]]));
  assert.equal(batch_signal.aborted, false);
  finish();
  await engine.settled();
  assert.deepEqual(loads, ["0000"]);
  assert.equal(engine.sample(points([[-1.7501, 1.9]])).levels[0], 4);
});

test("pending request budgets carry excess visible work forward to subsequent passes", async () => {
  const { engine, loads } = fixture({
    engine_options: { max_requests_per_pass: 1 },
  });
  const view = points([
    [-1.9, 1.9],
    [-1.4, 1.9],
  ]);
  engine.sample(view);
  assert.equal(engine.get_stats().pending, 1);
  await engine.settled();
  assert.deepEqual(loads, ["000"]);
  engine.sample(view);
  assert.equal(engine.get_stats().pending, 1);
  await engine.settled();
  assert.deepEqual(loads, ["000", "001"]);
  assert.deepEqual([...engine.sample(view).levels], [3, 3]);
});

test("catalog and pending budgets remain bounded, and used tiles survive metadata pressure", async () => {
  const { cache, engine } = fixture({
    engine_options: { max_catalog: 1, max_requests_per_pass: 1 },
  });
  await cache.load("000");
  const frame = engine.sample(close_points);
  assert.equal(frame.catalog_limited, true);
  assert.deepEqual([...frame.levels], [3, 3]);
  assert.equal(engine.get_stats().catalog, 1);
  const other = points([[0.1, 0.1]]);
  engine.sample(other);
  await engine.settled();
  assert.equal(engine.get_stats().catalog, 1);
  assert.equal(engine.get_stats().pending, 0);
});

test("sample buffers can be reused and reset/destroy leave cache ownership with the caller", async () => {
  const { cache, engine } = fixture();
  await cache.load("000");
  const out = create_flight_sample_buffer(2, 1);
  assert.strictEqual(engine.sample(close_points, out), out);
  await engine.settled();
  const sky = points([
    [0, 0],
    [0, 0],
  ]);
  sky.kinds.fill(FLIGHT_RAY_SKY);
  engine.sample(sky, out);
  assert.ok(out.values.every(Number.isNaN));
  assert.deepEqual([...out.tile_indices], [-1, -1]);
  assert.deepEqual(out.tile_codes, []);
  assert.equal(cache.get_stats().pinned, 0);
  engine.reset();
  assert.equal(engine.get_stats().catalog, 0);
  engine.destroy();
  engine.destroy();
  assert.ok(cache.peek("000"));
  assert.throws(() => engine.sample(close_points));
});

test("real projection intersections feed the adaptive numerical stage", async () => {
  const { engine } = fixture({ engine_options: { max_level: 5 } });
  const camera = create_flight_projection(
    {
      ...INITIAL_FLIGHT_STATE,
      position_re: -1.9,
      position_im: 1.9,
      altitude_world: 0.0001,
      camera_pitch_deg: -90,
    },
    { width_px: 5, height_px: 5 },
  );
  const intersections = trace_flight_frame(camera);
  for (let pass = 0; pass < 4; pass++) {
    engine.sample(intersections);
    await engine.settled();
  }
  const frame = engine.sample(intersections);
  assert.ok(frame.values.every(Number.isFinite));
  assert.ok(frame.levels.every((level) => level === 5));
  assert.equal(frame.unresolved_count, 0);
  assert.ok(frame.max_depth_duplicate_count > 0);
});

test("invalid buffers and limits fail before scheduling work", () => {
  const { cache, engine } = fixture();
  assert.throws(
    () => create_flight_refinement(cache, { max_level: 35 }),
    RangeError,
  );
  assert.throws(
    () => create_flight_refinement(cache, { max_catalog: 0 }),
    RangeError,
  );
  assert.throws(() => create_flight_sample_buffer(0, 1), RangeError);
  assert.throws(
    () => engine.sample(close_points, create_flight_sample_buffer(1, 1)),
    RangeError,
  );
  assert.throws(
    () => engine.sample({ ...close_points, kinds: new Uint8Array(1) }),
    RangeError,
  );
  assert.throws(
    () => engine.sample({ ...close_points, width_px: -2, height_px: -1 }),
    RangeError,
  );
  assert.equal(engine.get_stats().pending, 0);
});
