import assert from "node:assert/strict";
import test from "node:test";
import FractoCanvasBuffer from "@fracto/sdk/FractoCanvasBuffer.js";
import FractoColors from "@fracto/sdk/FractoColors.js";
import {
  build_flight_palette,
  color_flight_frame,
  DEFAULT_FLIGHT_FRAME_COLORS,
} from "../src/pages/games/flight/FlightFrameColors.js";
import {
  create_flight_frame_fallback,
  flight_escape_prefix,
} from "../src/pages/games/flight/FlightFrameFallback.js";
import FractoFastCalc from "@fracto/sdk/FractoFastCalc.js";
import {
  create_flight_intersections,
  create_flight_projection,
  trace_flight_pixel,
  FLIGHT_RAY_PLANE,
  FLIGHT_RAY_SKY,
  FLIGHT_RAY_HORIZON,
  FLIGHT_RAY_UNREPRESENTABLE,
} from "../src/pages/games/flight/FlightProjection.js";
import { create_flight_sample_buffer } from "../src/pages/games/flight/FlightRefinement.js";
import { INITIAL_FLIGHT_STATE } from "../src/pages/games/flight/FlightState.js";
import {
  flight_haze_density,
  flight_haze_transmission,
  normalize_flight_haze,
} from "../src/pages/games/flight/FlightAtmosphere.js";

test("atmosphere preserves clear colors, fades distant details first, and becomes dense fog", () => {
  const { samples, rays } = fixture(Array(9).fill([2, 10]));
  samples.width_px = rays.width_px = 3;
  samples.height_px = rays.height_px = 3;
  const projection = create_flight_projection(
    { ...INITIAL_FLIGHT_STATE, camera_pitch_deg: -35 },
    { width_px: 3, height_px: 3 },
  );
  const clear = color_flight_frame(samples, rays.kinds);
  assert.deepEqual(
    color_flight_frame(
      samples,
      rays.kinds,
      null,
      {},
      { projection, haze_percent: 0 },
    ),
    clear,
  );
  const haze = color_flight_frame(
    samples,
    rays.kinds,
    null,
    {},
    { projection, haze_percent: 50 },
  );
  const fog = color_flight_frame(
    samples,
    rays.kinds,
    null,
    {},
    { projection, haze_percent: 100 },
  );
  const fog_color = DEFAULT_FLIGHT_FRAME_COLORS.horizon;
  const difference = (pixels, index) =>
    fog_color
      .slice(0, 3)
      .reduce(
        (sum, value, channel) =>
          sum + Math.abs(value - pixels[index * 4 + channel]),
        0,
      );
  assert.ok(difference(haze, 1) < difference(haze, 7));
  for (let i = 0; i < 9; i++) {
    assert.ok(difference(haze, i) <= difference(clear, i));
    assert.ok(difference(fog, i) < 12);
    assert.equal(fog[i * 4 + 3], 255);
  }
  rays.kinds.set([
    FLIGHT_RAY_SKY,
    FLIGHT_RAY_HORIZON,
    FLIGHT_RAY_UNREPRESENTABLE,
  ]);
  assert.deepEqual(
    color_flight_frame(
      samples,
      rays.kinds,
      null,
      {},
      { projection, haze_percent: 100 },
    ).slice(0, 12),
    color_flight_frame(samples, rays.kinds).slice(0, 12),
  );
});

test("atmospheric distance follows banked fisheye rays and stays stable at extreme zoom", () => {
  const density = flight_haze_density(40);
  for (const altitude_world of [1e-80, 1, 1e80]) {
    const projection = create_flight_projection(
      {
        ...INITIAL_FLIGHT_STATE,
        altitude_world,
        camera_pitch_deg: -60,
        roll_deg: 25,
      },
      { width_px: 5, height_px: 3, fisheye_strength: 0.35 },
    );
    for (const [x, y] of [
      [0, 0],
      [2, 1],
      [4, 2],
    ]) {
      const hit = trace_flight_pixel(projection, x, y);
      assert.equal(hit.kind, FLIGHT_RAY_PLANE);
      const expected = Math.exp(
        -density * (hit.distance_world / altitude_world) ** 2,
      );
      assert.ok(
        Math.abs(
          flight_haze_transmission(projection, x, y, density) - expected,
        ) < 1e-12,
      );
    }
  }
  assert.equal(normalize_flight_haze(-1), 0);
  assert.equal(normalize_flight_haze(200), 100);
  assert.equal(normalize_flight_haze(NaN), 0);
});

test("doubling plane distance quadruples fog optical depth while nearby detail stays clear", () => {
  const density = flight_haze_density(25);
  const transmission_at_distance = (distance) => {
    const projection = create_flight_projection(
      {
        ...INITIAL_FLIGHT_STATE,
        camera_pitch_deg: (-Math.asin(1 / distance) * 180) / Math.PI,
      },
      { width_px: 1, height_px: 1 },
    );
    return flight_haze_transmission(projection, 0, 0, density);
  };
  const near = transmission_at_distance(1);
  const middle = transmission_at_distance(2);
  const far = transmission_at_distance(4);
  assert.ok(near > 0.98);
  assert.ok(near > middle && middle > far);
  assert.ok(Math.abs(Math.log(far) / Math.log(middle) - 4) < 1e-12);
  assert.ok(transmission_at_distance(16) < 0.02);
});

function fixture(pairs) {
  const samples = create_flight_sample_buffer(pairs.length, 1);
  samples.values.set(pairs.flat());
  const rays = create_flight_intersections(pairs.length, 1);
  rays.kinds.fill(FLIGHT_RAY_PLANE);
  rays.position_re.set(pairs.map((_, i) => 3 + i));
  rays.position_im.fill(0);
  return { samples, rays };
}
function css_rgb(style) {
  if (style.startsWith("rgb(")) return style.match(/[\d.]+/g).map(Number);
  const [hue, saturation, lightness] = style.match(/[\d.]+/g).map(Number);
  const h = hue / 360,
    s = saturation / 100,
    l = lightness / 100;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s,
    p = 2 * l - q;
  const channel = (value) => {
    let t = (value + 1) % 1;
    return (
      (t < 1 / 6
        ? p + (q - p) * 6 * t
        : t < 0.5
          ? q
          : t < 2 / 3
            ? p + (q - p) * (2 / 3 - t) * 6
            : p) * 255
    );
  };
  return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)];
}

test("RGBA output follows the existing SDK whole-frame palette for escaped, inner and outer samples", () => {
  const pairs = [
    [0, 4],
    [0, 15],
    [-2, -100],
    [-3, 200],
    [2, 20],
    [3, 30],
    [20000, 40],
  ];
  const { samples, rays } = fixture(pairs),
    before = samples.values.slice(),
    styles = new Map();
  FractoCanvasBuffer.buffer_to_canvas(
    pairs.map((pair) => [pair]),
    {
      fillRect(x) {
        styles.set(x, this.fillStyle);
      },
    },
  );
  const pixels = color_flight_frame(samples, rays.kinds);
  for (let i = 0; i < pairs.length; i++) {
    const expected = css_rgb(styles.get(i));
    for (let channel = 0; channel < 3; channel++)
      assert.ok(Math.abs(pixels[i * 4 + channel] - expected[channel]) <= 1);
    assert.equal(pixels[i * 4 + 3], 255);
  }
  assert.deepEqual(samples.values, before);
});

test("palettes use the whole current frame and recompute when numerical distribution changes", () => {
  const one = fixture([
    [0, 10],
    [0, 20],
    [2, 10],
    [-2, 10],
  ]);
  const palette = build_flight_palette(one.samples, one.rays.kinds);
  assert.deepEqual(
    palette.escaped,
    FractoColors.get_greys_map({ length: 2 }, { _10: 1, _20: 1 }, 50, 205),
  );
  assert.deepEqual(
    palette.inner,
    FractoColors.get_greys_map({ length: 1 }, { _10: 1 }, 15, 40),
  );
  const many = fixture([...Array(100).fill([0, 1]), [0, 10], [0, 20]]);
  assert.notEqual(
    build_flight_palette(many.samples, many.rays.kinds).escaped._10,
    palette.escaped._10,
  );
});

test("signed and fractional iterations produce finite colors, including the hue table boundary", () => {
  const a = fixture([
    [0, -1.25],
    [-20000, -2.5],
    [20000, 3.75],
  ]);
  const b = fixture([
    [0, 1.25],
    [-20000, 2.5],
    [20000, -3.75],
  ]);
  assert.deepEqual(
    color_flight_frame(a.samples, a.rays.kinds),
    color_flight_frame(b.samples, b.rays.kinds),
  );
  assert.ok(Number.isFinite(FractoColors.pattern_hue(20000)));
  assert.ok(
    Number.isFinite(
      FractoColors.get_greys_map({ length: 1 }, { "_1.25": 1 }, 50, 205)[
        "_1.25"
      ],
    ),
  );
});

test("sky, horizon, numerical misses and unresolved plane pixels overwrite reused RGBA without entering palettes", () => {
  const { samples, rays } = fixture([
    [2, 1],
    [2, 1],
    [2, 1],
    [NaN, NaN],
  ]);
  rays.kinds.set([
    FLIGHT_RAY_SKY,
    FLIGHT_RAY_HORIZON,
    FLIGHT_RAY_UNREPRESENTABLE,
    FLIGHT_RAY_PLANE,
  ]);
  const out = new Uint8ClampedArray(16).fill(255);
  assert.strictEqual(color_flight_frame(samples, rays.kinds, out), out);
  assert.deepEqual(
    [...out],
    [
      ...DEFAULT_FLIGHT_FRAME_COLORS.sky,
      ...DEFAULT_FLIGHT_FRAME_COLORS.horizon,
      ...DEFAULT_FLIGHT_FRAME_COLORS.unresolved,
      ...DEFAULT_FLIGHT_FRAME_COLORS.unresolved,
    ],
  );
  assert.deepEqual(build_flight_palette(samples, rays.kinds), {
    escaped: {},
    inner: {},
    outer: {},
  });
  assert.throws(
    () => color_flight_frame(samples, rays.kinds, new Uint8ClampedArray(1)),
    RangeError,
  );
  assert.throws(
    () =>
      color_flight_frame(samples, rays.kinds, out, { sky: [NaN, 0, 0, 255] }),
    RangeError,
  );
});

test("fallback respects count budgets, progresses over stable views and preserves tile provenance", () => {
  let calls = 0;
  const fallback = create_flight_frame_fallback({
    max_calculations: 1,
    escape_iterations: 0,
    budget_ms: 10,
    now: () => 0,
    calculate: () => {
      calls++;
      return { pattern: 0, iteration: 3 };
    },
  });
  const { samples, rays } = fixture([
    [NaN, NaN],
    [NaN, NaN],
    [NaN, NaN],
  ]);
  for (let pass = 0; pass < 3; pass++) {
    samples.values.fill(NaN);
    assert.equal(fallback.apply(rays, samples).unresolved, 2 - pass);
  }
  assert.equal(calls, 3);
  assert.ok(samples.levels.every((level) => level === 0));
  samples.values.fill(NaN);
  assert.equal(fallback.apply(rays, samples).calculated, 0);
  samples.values.set([4, 100], 0);
  rays.position_re[0] = 42;
  fallback.apply(rays, samples);
  assert.equal(calls, 3);
  assert.equal(samples.values[0], 4);
  fallback.reset();
  samples.values.fill(NaN);
  fallback.apply(rays, samples);
  assert.equal(calls, 4);
});

test("bounded fallback records iteration limits and errors without coloring estimates as known data", () => {
  let calls = 0;
  const fallback = create_flight_frame_fallback({
    escape_iterations: 0,
    now: () => 0,
    calculate: (re, im, limit) => {
      calls++;
      assert.equal(limit, 10000);
      if (re === 3) return { pattern: 2, iteration: 9999, estimated: true };
      throw new Error("calculation failed");
    },
  });
  const { samples, rays } = fixture([
    [NaN, NaN],
    [NaN, NaN],
  ]);
  const stats = fallback.apply(rays, samples);
  assert.equal(stats.limited, 1);
  assert.equal(stats.errors, 1);
  assert.equal(stats.unresolved, 2);
  assert.ok(samples.values.every(Number.isNaN));
  fallback.apply(rays, samples);
  assert.equal(calls, 2);
});

test("fallback checks calculation time, skips non-plane rays and invalidates moved coordinates", () => {
  let clock = 0;
  const fallback = create_flight_frame_fallback({
    escape_iterations: 0,
    budget_ms: 1,
    now: () => clock,
    calculate: () => {
      clock += 2;
      return { pattern: 0, iteration: 1 };
    },
  });
  const { samples, rays } = fixture([
    [NaN, NaN],
    [NaN, NaN],
    [NaN, NaN],
  ]);
  rays.kinds[2] = FLIGHT_RAY_SKY;
  assert.equal(fallback.apply(rays, samples).calculated, 1);
  samples.values.fill(NaN);
  assert.equal(fallback.apply(rays, samples).calculated, 1);
  samples.values.fill(NaN);
  rays.position_re[0]++;
  assert.equal(fallback.apply(rays, samples).calculated, 1);
  assert.throws(
    () => create_flight_frame_fallback({ iteration_limit: 1 }),
    RangeError,
  );
});

test("production zero-seed fallback calculates uncovered escaping points", () => {
  const { samples, rays } = fixture([[NaN, NaN]]);
  const stats = create_flight_frame_fallback({ budget_ms: 100 }).apply(
    rays,
    samples,
  );
  assert.equal(stats.unresolved, 0);
  assert.equal(samples.values[0], 0);
  assert.ok(samples.values[1] > 0);
});

test("short escape prefixes match SDK iterations and fill moving exterior pixels beyond the expensive-work budget", () => {
  for (const [re, im] of [
    [3, 0],
    [-3, 0.2],
    [0.6, 0],
    [-0.5, 2],
    [100, -100],
  ]) {
    const prefix = flight_escape_prefix(re, im);
    if (prefix)
      assert.equal(
        prefix,
        FractoFastCalc.calc_from_seed(re, im, 0, 0, 10, 10000).iteration,
      );
  }
  assert.equal(flight_escape_prefix(0, 0), 0);
  assert.throws(() => flight_escape_prefix(Infinity, 0), TypeError);
  assert.throws(() => flight_escape_prefix(0, 0, Infinity), RangeError);
  const { samples, rays } = fixture(Array(30).fill([NaN, NaN]));
  const fallback = create_flight_frame_fallback({
    max_calculations: 1,
    budget_ms: 0,
  });
  let stats = fallback.apply(rays, samples);
  assert.equal(stats.fast_escaped, 30);
  assert.equal(stats.calculated, 0);
  assert.equal(stats.unresolved, 0);
  samples.values.fill(NaN);
  rays.position_re.forEach((value, i) => {
    rays.position_re[i] = value + 0.01;
  });
  stats = fallback.apply(rays, samples);
  assert.equal(stats.fast_escaped, 30);
  assert.ok(samples.values.every(Number.isFinite));
});
