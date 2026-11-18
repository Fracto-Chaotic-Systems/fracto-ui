import assert from "node:assert/strict";
import test from "node:test";
import {
  create_flight_projection,
  create_flight_intersections,
  flight_ray_for_pixel,
  trace_flight_pixel,
  trace_flight_frame,
  FLIGHT_RAY_SKY,
  FLIGHT_RAY_HORIZON,
  FLIGHT_RAY_PLANE,
  FLIGHT_RAY_UNREPRESENTABLE,
} from "../src/pages/games/flight/FlightProjection.js";
import { INITIAL_FLIGHT_STATE } from "../src/pages/games/flight/FlightState.js";

const close = (actual, expected, tolerance = 1e-10) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} != ${expected}`,
  );
const projection = (state = {}, viewport = {}) =>
  create_flight_projection(
    { ...INITIAL_FLIGHT_STATE, ...state },
    { width_px: 3, height_px: 3, ...viewport },
  );

test("initial north-facing view separates sky, horizon and forward plane hits", () => {
  const camera = projection();
  const frame = trace_flight_frame(camera);
  assert.deepEqual(
    [...frame.kinds],
    [
      FLIGHT_RAY_SKY,
      FLIGHT_RAY_SKY,
      FLIGHT_RAY_SKY,
      FLIGHT_RAY_HORIZON,
      FLIGHT_RAY_HORIZON,
      FLIGHT_RAY_HORIZON,
      FLIGHT_RAY_PLANE,
      FLIGHT_RAY_PLANE,
      FLIGHT_RAY_PLANE,
    ],
  );
  close(frame.position_re[7], -0.5);
  close(frame.position_im[7], -2 + (3 * Math.sqrt(3)) / 2);
  assert.ok(frame.position_re[6] < frame.position_re[7]);
  assert.ok(frame.position_re[8] > frame.position_re[7]);
  assert.ok(Number.isNaN(frame.position_re[4]));
  assert.deepEqual(trace_flight_pixel(camera, 1, 1), {
    kind: FLIGHT_RAY_HORIZON,
  });
});

test("center rays look toward cardinal headings with correct altitude-scaled intersections", () => {
  for (const [camera_heading_deg, re, im] of [
    [0, 0, 1],
    [90, 1, 0],
    [180, 0, -1],
    [270, -1, 0],
    [450, 1, 0],
  ]) {
    const hit = trace_flight_pixel(
      projection({
        camera_heading_deg,
        camera_pitch_deg: -45,
        altitude_world: 2,
      }),
      1,
      1,
    );
    assert.equal(hit.kind, FLIGHT_RAY_PLANE);
    close(hit.position_re, -0.5 + 2 * re);
    close(hit.position_im, -2 + 2 * im);
    close(hit.distance_world, 2 * Math.sqrt(2));
  }
});

test("pole views remain defined with a stable screen-right direction", () => {
  const down = projection({ camera_pitch_deg: -90 }, { vertical_fov_deg: 90 });
  const frame = trace_flight_frame(down);
  assert.ok(frame.kinds.every((kind) => kind === FLIGHT_RAY_PLANE));
  close(frame.position_re[4], -0.5);
  close(frame.position_im[4], -2);
  close(frame.position_re[0], -0.5 - 2 / 3);
  close(frame.position_im[0], -2 + 2 / 3);
  close(trace_flight_pixel(down, 1, 1).distance_world, 1);
  const up = trace_flight_frame(projection({ camera_pitch_deg: 90 }));
  assert.ok(up.kinds.every((kind) => kind === FLIGHT_RAY_SKY));
});

test("pixel centers, vertical field of view and aspect ratio produce square perspective pixels", () => {
  const camera = projection(
    {},
    { width_px: 6, height_px: 2, vertical_fov_deg: 90 },
  );
  const left = flight_ray_for_pixel(camera, 0, 0);
  const right = flight_ray_for_pixel(camera, 5, 1);
  close(left.re / left.im, -2.5);
  close(left.up / left.im, 0.5);
  close(right.re / right.im, 2.5);
  close(right.up / right.im, -0.5);
  close(Math.hypot(left.re, left.im, left.up), 1);
  assert.ok(!trace_flight_frame(camera).kinds.includes(FLIGHT_RAY_HORIZON));
});

test("only independent camera fields control viewing; snapshots stay immutable", () => {
  const state = Object.freeze({
    ...INITIAL_FLIGHT_STATE,
    camera_pitch_deg: -45,
  });
  const before = { ...state };
  const first = create_flight_projection(state, { width_px: 3, height_px: 3 });
  const second = projection({
    ...state,
    heading_deg: 210,
    pitch_deg: 30,
    roll_deg: 60,
    airspeed_knots: 300,
  });
  assert.deepEqual(trace_flight_frame(first), trace_flight_frame(second));
  assert.deepEqual(state, before);
  assert.ok(Object.isFrozen(first) && Object.isFrozen(first.forward));
});

test("raster intersections agree with unit-ray geometry across poses and raster shapes", () => {
  for (const camera_heading_deg of [0, 43, 180, 359]) {
    for (const camera_pitch_deg of [-90, -61, -1, 0, 37, 90]) {
      const camera = projection(
        { camera_heading_deg, camera_pitch_deg },
        { width_px: 8, height_px: 5, vertical_fov_deg: 80 },
      );
      const frame = trace_flight_frame(camera);
      for (let y = 0; y < 5; y++)
        for (let x = 0; x < 8; x++) {
          const index = y * 8 + x;
          const hit = trace_flight_pixel(camera, x, y);
          assert.equal(frame.kinds[index], hit.kind);
          if (hit.kind !== FLIGHT_RAY_PLANE) {
            assert.ok(Number.isNaN(frame.position_re[index]));
            assert.ok(Number.isNaN(frame.position_im[index]));
            continue;
          }
          const ray = flight_ray_for_pixel(camera, x, y);
          close(camera.origin.up + ray.up * hit.distance_world, 0);
          close(
            frame.position_re[index],
            camera.origin.re + ray.re * hit.distance_world,
          );
          close(
            frame.position_im[index],
            camera.origin.im + ray.im * hit.distance_world,
          );
        }
    }
  }
});

test("reusing output buffers clears old plane coordinates on sky and horizon pixels", () => {
  const output = create_flight_intersections(3, 3);
  assert.strictEqual(
    trace_flight_frame(projection({ camera_pitch_deg: -90 }), output),
    output,
  );
  assert.ok(output.position_re.every(Number.isFinite));
  trace_flight_frame(projection(), output);
  for (let index = 0; index < 6; index++) {
    assert.ok(Number.isNaN(output.position_re[index]));
    assert.ok(Number.isNaN(output.position_im[index]));
  }
  trace_flight_frame(projection({ camera_pitch_deg: 90 }), output);
  assert.ok(output.position_re.every(Number.isNaN));
  assert.ok(output.position_im.every(Number.isNaN));
});

test("near-parallel rays have explicit horizon results without imposing a far-distance clip", () => {
  const near = projection({ camera_pitch_deg: -1e-11 });
  assert.equal(trace_flight_pixel(near, 1, 1).kind, FLIGHT_RAY_HORIZON);
  const distant = trace_flight_pixel(
    projection({ camera_pitch_deg: -1e-8 }),
    1,
    1,
  );
  assert.equal(distant.kind, FLIGHT_RAY_PLANE);
  assert.ok(distant.distance_world > 1e9);
  for (const altitude_world of [1e-100, 1e100]) {
    const hit = trace_flight_pixel(
      projection({ camera_pitch_deg: -45, altitude_world }),
      1,
      1,
    );
    assert.equal(hit.kind, FLIGHT_RAY_PLANE);
    assert.ok(Number.isFinite(hit.distance_world));
  }
  const overflowing = projection({
    camera_pitch_deg: -1,
    altitude_world: Number.MAX_VALUE,
  });
  assert.equal(
    trace_flight_pixel(overflowing, 1, 1).kind,
    FLIGHT_RAY_UNREPRESENTABLE,
  );
  const frame = trace_flight_frame(overflowing);
  assert.equal(frame.kinds[4], FLIGHT_RAY_UNREPRESENTABLE);
  assert.ok(Number.isNaN(frame.position_re[4]));
  const extreme_down = projection({
    camera_pitch_deg: -90,
    altitude_world: Number.MAX_VALUE,
  });
  const extreme_frame = trace_flight_frame(extreme_down);
  assert.equal(extreme_frame.kinds[4], FLIGHT_RAY_PLANE);
  assert.equal(extreme_frame.kinds[0], FLIGHT_RAY_UNREPRESENTABLE);
  assert.equal(
    trace_flight_pixel(extreme_down, 0, 0).kind,
    FLIGHT_RAY_UNREPRESENTABLE,
  );
});

test("projection and typed results can cross a worker boundary deterministically", () => {
  const camera = projection({ camera_pitch_deg: -30 });
  const frame = trace_flight_frame(camera);
  const copy = structuredClone(frame, {
    transfer: [
      frame.kinds.buffer,
      frame.position_re.buffer,
      frame.position_im.buffer,
    ],
  });
  assert.deepEqual(trace_flight_frame(structuredClone(camera)), copy);
  assert.equal(frame.kinds.byteLength, 0);
});

test("invalid camera, viewport, pixel and output inputs fail explicitly", () => {
  for (const viewport of [
    { width_px: 0 },
    { height_px: -1 },
    { width_px: 1.5 },
    { width_px: Infinity },
    { width_px: Number.MAX_SAFE_INTEGER, height_px: 3 },
    { vertical_fov_deg: 0 },
    { vertical_fov_deg: 180 },
    { vertical_fov_deg: NaN },
  ])
    assert.throws(() => projection({}, viewport), RangeError);
  for (const state of [
    { position_re: NaN },
    { position_im: Infinity },
    { altitude_world: NaN },
    { camera_heading_deg: Infinity },
    { camera_pitch_deg: undefined },
  ])
    assert.throws(() => projection(state), TypeError);
  for (const state of [
    { altitude_world: 0 },
    { altitude_world: -1 },
    { camera_pitch_deg: 91 },
  ])
    assert.throws(() => projection(state), RangeError);
  assert.throws(() => create_flight_intersections(0, 3), RangeError);
  const camera = projection();
  for (const [x, y] of [
    [-1, 0],
    [3, 0],
    [0, 3],
    [0.5, 0],
    [NaN, 0],
  ])
    assert.throws(() => flight_ray_for_pixel(camera, x, y), RangeError);
  assert.throws(
    () => trace_flight_frame(camera, create_flight_intersections(2, 3)),
    RangeError,
  );
  assert.throws(
    () =>
      trace_flight_frame(camera, {
        ...create_flight_intersections(3, 3),
        position_re: new Float32Array(9),
      }),
    RangeError,
  );
});
