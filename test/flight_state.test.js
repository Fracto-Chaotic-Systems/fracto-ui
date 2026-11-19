import assert from "node:assert/strict";
import test from "node:test";
import {
  create_flight_state,
  PREVIEW_FLIGHT_STATE,
  INITIAL_FLIGHT_STATE,
} from "../src/pages/games/flight/FlightState.js";
import { flight_instrument_props } from "../src/pages/games/flight/FlightInstrumentModel.js";

test("partial updates publish atomic immutable snapshots and preserve unchanged readings", () => {
  const store = create_flight_state(PREVIEW_FLIGHT_STATE);
  const first = store.get_snapshot();
  assert.ok(Object.isFrozen(first));
  let updates = 0;
  let observed;
  const unsubscribe = store.subscribe(() => {
    updates++;
    observed = store.get_snapshot();
  });
  store.update({ source: "live", heading_deg: 361, airspeed_knots: 120 });
  assert.equal(updates, 1);
  assert.equal(observed.source, "live");
  assert.equal(observed.heading_deg, 1);
  assert.equal(observed.airspeed_knots, 120);
  assert.equal(observed.altitude_ft, 2500);
  assert.equal(first.heading_deg, 45);
  assert.throws(() => {
    observed.heading_deg = 8;
  }, TypeError);
  store.update({ heading_deg: 721 });
  store.update(null);
  assert.equal(updates, 1);
  assert.strictEqual(store.get_snapshot(), observed);
  unsubscribe();
  store.update({ altitude_ft: 4000 });
  assert.equal(updates, 1);
  store.reset();
  assert.deepEqual(store.get_snapshot(), first);
});

test("invalid telemetry retains finite readings, bounds physical values, and drops unknown fields", () => {
  const store = create_flight_state(PREVIEW_FLIGHT_STATE);
  store.update({
    source: "invalid",
    pitch_deg: 150,
    roll_deg: 350,
    heading_deg: -1,
    airspeed_knots: -5,
    altitude_ft: -200,
    vertical_speed_fpm: NaN,
    turn_rate_deg_s: Infinity,
    slip: 10,
    pressure_hpa: 0,
    arbitrary: "ignored",
  });
  assert.deepEqual(store.get_snapshot(), {
    position_re: -0.5,
    position_im: -2,
    altitude_world: 1,
    camera_heading_deg: 0,
    camera_pitch_deg: 0,
    source: "preview",
    pitch_deg: 90,
    roll_deg: -10,
    heading_deg: 359,
    airspeed_knots: 0,
    altitude_ft: -200,
    vertical_speed_fpm: 500,
    turn_rate_deg_s: -1,
    slip: 1,
    pressure_hpa: 1013,
  });
  store.update({ altitude_ft: "1234", pressure_hpa: -5, slip: -8 });
  assert.equal(store.get_snapshot().altitude_ft, -200);
  assert.equal(store.get_snapshot().pressure_hpa, 1013);
  assert.equal(store.get_snapshot().slip, -1);
});

test("gameplay starts hovering north and world/camera fields normalize atomically", () => {
  const store = create_flight_state(INITIAL_FLIGHT_STATE);
  const initial = store.get_snapshot();
  assert.equal(initial.position_re, -0.5);
  assert.equal(initial.position_im, -2);
  assert.equal(initial.altitude_world, 1);
  assert.equal(initial.altitude_ft, 2500);
  assert.equal(initial.airspeed_knots, 0);
  assert.equal(initial.heading_deg, 0);
  assert.equal(initial.camera_heading_deg, 0);
  assert.equal(initial.camera_pitch_deg, (-Math.atan2(1, 2) * 180) / Math.PI);
  assert.equal(initial.pitch_deg, 0);
  store.update({
    position_re: 2,
    position_im: 3,
    altitude_world: 0.25,
    camera_heading_deg: -1,
    camera_pitch_deg: 100,
  });
  assert.equal(store.get_snapshot().camera_heading_deg, 359);
  assert.equal(store.get_snapshot().camera_pitch_deg, 90);
  const last = store.get_snapshot();
  store.update({
    position_re: NaN,
    position_im: Infinity,
    altitude_world: -1,
    camera_heading_deg: Infinity,
    camera_pitch_deg: NaN,
  });
  assert.strictEqual(store.get_snapshot(), last);
  store.update({ altitude_world: 0 });
  assert.strictEqual(store.get_snapshot(), last);
  store.reset();
  assert.deepEqual(store.get_snapshot(), initial);
});

test("uninitialized stores are unavailable and each game owns an independent lifetime", () => {
  const first = create_flight_state();
  const second = create_flight_state();
  assert.equal(first.get_snapshot().source, "unavailable");
  first.update({
    source: "live",
    airspeed_knots: 320,
    vertical_speed_fpm: 7000,
  });
  assert.equal(first.get_snapshot().airspeed_knots, 320);
  assert.equal(first.get_snapshot().vertical_speed_fpm, 7000);
  assert.equal(second.get_snapshot().airspeed_knots, 0);
  first.reset();
  assert.deepEqual(first.get_snapshot(), second.get_snapshot());
});

test("instrument adapters preserve units and pitch, turn, and descent signs", () => {
  const store = create_flight_state({
    source: "live",
    airspeed_knots: 123,
    pitch_deg: -12,
    roll_deg: 24,
    heading_deg: 359,
    altitude_ft: -50,
    pressure_hpa: 1005,
    vertical_speed_fpm: -750,
    turn_rate_deg_s: 3,
    slip: -0.5,
  });
  const state = store.get_snapshot();
  assert.deepEqual(flight_instrument_props("airspeed", state), {
    speed: 123,
    max: 500,
    unit: "KNOTS",
    arcs: {
      white: [82.5, 212.5],
      green: [110, 322.5],
      yellow: [322.5, 407.5],
      red: 407.5,
    },
  });
  assert.deepEqual(flight_instrument_props("attitude", state), {
    pitch: -12,
    roll: 24,
    pitchLimit: 40,
  });
  assert.deepEqual(flight_instrument_props("heading", state), { heading: 359 });
  assert.deepEqual(flight_instrument_props("altitude", state), {
    altitude: -50,
    pressure: 1005,
    pressureUnit: "hPa",
  });
  assert.deepEqual(flight_instrument_props("vertical_speed", state), {
    verticalSpeed: -750,
    max: 2000,
  });
  assert.deepEqual(flight_instrument_props("turn", state), {
    turnRate: 3,
    slip: -0.5,
  });
  assert.throws(() => flight_instrument_props("unknown", state));
});

test("heading wraparound and unavailable telemetry retain finite, truthful snapshots", () => {
  const store = create_flight_state(PREVIEW_FLIGHT_STATE);
  for (const [input, expected] of [
    [-721, 359],
    [-360, 0],
    [-1, 359],
    [359, 359],
    [360, 0],
    [361, 1],
    [720, 0],
  ]) {
    store.update({ source: "live", heading_deg: input });
    assert.equal(store.get_snapshot().heading_deg, expected);
  }
  store.update({ heading_deg: 359 });
  const last = store.get_snapshot();
  store.update({
    source: "unavailable",
    heading_deg: NaN,
    altitude_ft: undefined,
    airspeed_knots: Infinity,
  });
  assert.equal(store.get_snapshot().source, "unavailable");
  assert.equal(store.get_snapshot().heading_deg, 359);
  assert.equal(store.get_snapshot().airspeed_knots, last.airspeed_knots);
  assert.equal(store.get_snapshot().altitude_ft, last.altitude_ft);
  assert.ok(
    Object.values(store.get_snapshot())
      .filter((value) => typeof value === "number")
      .every(Number.isFinite),
  );
});
