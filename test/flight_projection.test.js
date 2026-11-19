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
import { step_flight_state } from "../src/pages/games/flight/FlightDynamics.js";
import {
  normalize_fisheye_strength,
  fisheye_slider_value,
  fisheye_strength_for_slider,
} from "../src/pages/games/flight/FlightLens.js";

const close = (actual, expected, tolerance = 1e-10) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
    `${actual} != ${expected}`,
  );
const projection = (state = {}, viewport = {}) =>
  create_flight_projection(
    { ...INITIAL_FLIGHT_STATE, camera_pitch_deg: 0, ...state },
    { width_px: 3, height_px: 3, ...viewport },
  );

test("level north-facing view separates sky, horizon and forward plane hits", () => {
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

test("reset view places i=0 across the middle of cinema and porthole displays", () => {
  for (const [width_px, height_px] of [
    [641, 481],
    [641, 641],
    [1001, 301],
  ]) {
    for (const fisheye_strength of [0, 0.35]) {
      const camera = create_flight_projection(INITIAL_FLIGHT_STATE, {
        width_px,
        height_px,
        fisheye_strength,
      });
      for (const x of [0, (width_px - 1) / 2, width_px - 1]) {
        const hit = trace_flight_pixel(camera, x, (height_px - 1) / 2);
        assert.equal(hit.kind, FLIGHT_RAY_PLANE);
        close(hit.position_im, 0);
      }
    }
  }
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

test("craft attitude controls viewing while look offsets and snapshots stay immutable", () => {
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
  assert.notDeepEqual(trace_flight_frame(first), trace_flight_frame(second));
  assert.deepEqual(
    trace_flight_frame(first),
    trace_flight_frame(projection({ ...state, airspeed_knots: 300 })),
  );
  assert.deepEqual(state, before);
  assert.ok(Object.isFrozen(first) && Object.isFrozen(first.forward));
});

test("neutral look faces the direction of motion at any heading, climb angle and bank", () => {
  for (const heading_deg of [0, 90, 210, 359])
    for (const pitch_deg of [-25, 0, 25]) {
      const state = {
        ...INITIAL_FLIGHT_STATE,
        heading_deg,
        camera_pitch_deg: 0,
        pitch_deg,
        roll_deg: 40,
        airspeed_knots: 100,
      };
      const camera = projection(state);
      const ray = flight_ray_for_pixel(camera, 1, 1);
      const heading = (heading_deg * Math.PI) / 180;
      const pitch = (pitch_deg * Math.PI) / 180;
      close(ray.re, Math.sin(heading) * Math.cos(pitch));
      close(ray.im, Math.cos(heading) * Math.cos(pitch));
      close(ray.up, Math.sin(pitch));
      // With no bank, a simulation displacement must have this same direction.
      const start = { ...state, roll_deg: 0 };
      const moved = step_flight_state(start, { connected: true }, 0.05);
      const delta = [
        moved.position_re - start.position_re,
        moved.position_im - start.position_im,
        moved.altitude_world - start.altitude_world,
      ];
      const distance = Math.hypot(...delta);
      close(delta[0] / distance, ray.re);
      close(delta[1] / distance, ray.im);
      close(delta[2] / distance, ray.up);
    }
});

test("descent moves the horizon up and ascent moves it down", () => {
  const horizon_row = (camera) =>
    camera.height_px / 2 +
    camera.forward.up / (camera.pixel_step * camera.up.up);
  const level = projection({}, { width_px: 101, height_px: 101 });
  const descent = projection(
    { pitch_deg: -20 },
    { width_px: 101, height_px: 101 },
  );
  const ascent = projection(
    { pitch_deg: 20 },
    { width_px: 101, height_px: 101 },
  );
  assert.ok(horizon_row(descent) < horizon_row(level));
  assert.ok(horizon_row(ascent) > horizon_row(level));
  assert.equal(trace_flight_pixel(descent, 50, 50).kind, FLIGHT_RAY_PLANE);
  assert.equal(trace_flight_pixel(ascent, 50, 50).kind, FLIGHT_RAY_SKY);
});

test("bank tilts the horizon in opposite directions for left and right rolls", () => {
  const right = projection({ roll_deg: 45 });
  const left = projection({ roll_deg: -45 });
  assert.equal(trace_flight_pixel(right, 0, 1).kind, FLIGHT_RAY_SKY);
  assert.equal(trace_flight_pixel(right, 2, 1).kind, FLIGHT_RAY_PLANE);
  assert.equal(trace_flight_pixel(left, 0, 1).kind, FLIGHT_RAY_PLANE);
  assert.equal(trace_flight_pixel(left, 2, 1).kind, FLIGHT_RAY_SKY);
  assert.equal(trace_flight_pixel(right, 1, 1).kind, FLIGHT_RAY_HORIZON);
});

test("retained look offsets follow turns and pitch changes in the banked craft frame", () => {
  const state = {
    ...INITIAL_FLIGHT_STATE,
    camera_heading_deg: 30,
    camera_pitch_deg: -10,
  };
  const turned = projection({ ...state, heading_deg: 120 });
  const heading = (150 * Math.PI) / 180;
  close(turned.forward.re, Math.sin(heading) * Math.cos((-10 * Math.PI) / 180));
  close(turned.forward.im, Math.cos(heading) * Math.cos((-10 * Math.PI) / 180));
  const climbed = projection({ pitch_deg: 20, camera_pitch_deg: -10 });
  close(climbed.forward.up, Math.sin((10 * Math.PI) / 180));
  // Looking right in a right-banked craft points toward its lowered right wing.
  const banked = projection({ roll_deg: 30, camera_heading_deg: 90 });
  close(banked.forward.re, Math.cos(Math.PI / 6));
  close(banked.forward.up, -0.5);
  const above = projection({ pitch_deg: 30, camera_pitch_deg: 90 });
  close(above.forward.up, Math.cos(Math.PI / 6));
  close(above.forward.im, -0.5);
});

test("raster intersections agree with unit-ray geometry across poses and raster shapes", () => {
  for (const camera_heading_deg of [0, 43, 180, 359]) {
    for (const camera_pitch_deg of [-90, -61, -1, 0, 37, 90])
      for (const roll_deg of [-60, 0, 60]) {
        const camera = projection(
          {
            heading_deg: 123,
            pitch_deg: 17,
            roll_deg,
            camera_heading_deg,
            camera_pitch_deg,
          },
          { width_px: 8, height_px: 5, vertical_fov_deg: 80 },
        );
        const frame = trace_flight_frame(camera);
        const axes = [camera.forward, camera.right, camera.up];
        for (let i = 0; i < axes.length; i++) {
          close(Math.hypot(axes[i].re, axes[i].im, axes[i].up), 1);
          for (let j = i + 1; j < axes.length; j++)
            close(
              axes[i].re * axes[j].re +
                axes[i].im * axes[j].im +
                axes[i].up * axes[j].up,
              0,
            );
        }
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

test("fisheye preserves the center and symmetry while expanding peripheral rays", () => {
  const pinhole = projection({}, { width_px: 9, height_px: 7 });
  const lens = projection(
    {},
    { width_px: 9, height_px: 7, fisheye_strength: 0.35 },
  );
  assert.deepEqual(
    flight_ray_for_pixel(lens, 4, 3),
    flight_ray_for_pixel(pinhole, 4, 3),
  );
  const center = flight_ray_for_pixel(lens, 4, 3);
  const edge = flight_ray_for_pixel(lens, 8, 3);
  const old_edge = flight_ray_for_pixel(pinhole, 8, 3);
  assert.ok(edge.re / edge.im > old_edge.re / old_edge.im);
  const opposite = flight_ray_for_pixel(lens, 0, 3);
  close(edge.re, -opposite.re);
  close(edge.im, opposite.im);
  close(center.up, 0);
  assert.ok(
    trace_flight_frame(lens).kinds.every((kind) => Number.isInteger(kind)),
  );
});

test("lens strength preserves legacy preferences and slider precision from zero to maximum", () => {
  assert.equal(normalize_fisheye_strength(-1, false), 0);
  assert.equal(normalize_fisheye_strength(undefined, true), 0.35);
  assert.equal(normalize_fisheye_strength(NaN), 0.35);
  assert.equal(normalize_fisheye_strength(0, true), 0);
  assert.equal(normalize_fisheye_strength(12, false), 12);
  assert.equal(normalize_fisheye_strength(1000), 64);
  for (const strength of [0, 0.01, 0.35, 1, 10, 64])
    close(
      fisheye_strength_for_slider(fisheye_slider_value(strength)),
      strength,
    );
  assert.ok(fisheye_strength_for_slider(10) < 0.1);
});

test("maximum fisheye encloses a full circular horizon when looking down", () => {
  for (const [width_px, height_px] of [
    [161, 121],
    [241, 121],
    [121, 161],
  ]) {
    const camera = projection(
      { pitch_deg: -20 },
      { width_px, height_px, fisheye_strength: 64 },
    );
    const frame = trace_flight_frame(camera);
    for (let x = 0; x < width_px; x++) {
      assert.equal(frame.kinds[x], FLIGHT_RAY_SKY);
      assert.equal(frame.kinds[(height_px - 1) * width_px + x], FLIGHT_RAY_SKY);
    }
    for (let y = 0; y < height_px; y++) {
      assert.equal(frame.kinds[y * width_px], FLIGHT_RAY_SKY);
      assert.equal(frame.kinds[y * width_px + width_px - 1], FLIGHT_RAY_SKY);
    }
    assert.equal(
      trace_flight_pixel(camera, (width_px - 1) / 2, (height_px - 1) / 2).kind,
      FLIGHT_RAY_PLANE,
    );
    const center_v =
      -Math.cos((20 * Math.PI) / 180) /
      (2 * camera.lens_curve * Math.sin((20 * Math.PI) / 180));
    const radius = Math.sqrt(1 / camera.lens_curve + center_v ** 2);
    for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 4)
      for (const [factor, kind] of [
        [0.75, FLIGHT_RAY_PLANE],
        [1.25, FLIGHT_RAY_SKY],
      ]) {
        const x = Math.round(
          (width_px - 1) / 2 +
            (factor * radius * Math.cos(angle)) / camera.pixel_step,
        );
        const y = Math.round(
          (height_px - 1) / 2 -
            (center_v + factor * radius * Math.sin(angle)) / camera.pixel_step,
        );
        assert.equal(trace_flight_pixel(camera, x, y).kind, kind);
      }
  }
});

test("fisheye bends an off-center horizon and agrees with scalar rays at all attitudes", () => {
  for (const [width_px, height_px] of [
    [9, 7],
    [7, 9],
  ])
    for (const fisheye_strength of [0.35, 4, 64])
      for (const roll_deg of [-40, 0, 40])
        for (const pitch_deg of [-90, -15, 15, 90]) {
          const lens = projection(
            { heading_deg: 57, pitch_deg, roll_deg, camera_heading_deg: 23 },
            { width_px, height_px, fisheye_strength },
          );
          const frame = trace_flight_frame(lens);
          for (let y = 0; y < height_px; y++)
            for (let x = 0; x < width_px; x++) {
              const hit = trace_flight_pixel(lens, x, y);
              const index = y * width_px + x;
              assert.equal(frame.kinds[index], hit.kind);
              if (hit.kind === FLIGHT_RAY_PLANE) {
                close(frame.position_re[index], hit.position_re);
                close(frame.position_im[index], hit.position_im);
              } else assert.ok(Number.isNaN(frame.position_re[index]));
            }
        }
  const lens = projection(
    { pitch_deg: -15 },
    { width_px: 101, height_px: 101, fisheye_strength: 0.35 },
  );
  const crossing = (x) => {
    for (let y = 0; y < 101; y++)
      if (trace_flight_pixel(lens, x, y).kind === FLIGHT_RAY_PLANE) return y;
  };
  assert.ok(crossing(0) > crossing(50));
  assert.equal(crossing(0), crossing(100));
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
    { fisheye_strength: NaN },
    { fisheye_strength: -0.1 },
    { fisheye_strength: 64.01 },
  ])
    assert.throws(() => projection({}, viewport), RangeError);
  for (const state of [
    { position_re: NaN },
    { position_im: Infinity },
    { altitude_world: NaN },
    { heading_deg: Infinity },
    { pitch_deg: NaN },
    { roll_deg: undefined },
    { camera_heading_deg: Infinity },
    { camera_pitch_deg: undefined },
  ])
    assert.throws(() => projection(state), TypeError);
  for (const state of [
    { altitude_world: 0 },
    { altitude_world: -1 },
    { camera_pitch_deg: 91 },
    { pitch_deg: -91 },
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
