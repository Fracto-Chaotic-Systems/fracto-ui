import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_INSTRUMENT_SETTINGS,
  FLIGHT_INSTRUMENT_CODES,
  normalize_instrument_settings,
  speed_from_knots,
  speed_to_knots,
} from "../src/pages/games/flight/FlightInstrumentSettings.js";
import {
  flight_instrument_props,
  HPA_PER_INHG,
} from "../src/pages/games/flight/FlightInstrumentModel.js";
import { PREVIEW_FLIGHT_STATE } from "../src/pages/games/flight/FlightState.js";
import { game_controls_layout } from "../src/pages/games/GamesPlayControlsLayout.js";

test("malformed persisted settings fall back safely and normalize ranges and placements", () => {
  for (const value of [null, undefined, [], "bad"]) {
    assert.deepEqual(
      normalize_instrument_settings(value),
      DEFAULT_INSTRUMENT_SETTINGS,
    );
  }
  const value = normalize_instrument_settings({
    visible: "false",
    size: "giant",
    speed_unit: "mph",
    pressure_unit: "bad",
    speed_max_knots: -2,
    pitch_limit_deg: 180,
    vertical_speed_max_fpm: Infinity,
    animation_ms: 5000,
    placements: {
      airspeed: "right",
      heading: "hidden",
      turn: "bad",
      unknown: "left",
    },
  });
  assert.equal(value.visible, true);
  assert.equal(value.size, "medium");
  assert.equal(value.speed_unit, "knots");
  assert.equal(value.pressure_unit, "hPa");
  assert.equal(value.speed_max_knots, 20);
  assert.equal(value.pitch_limit_deg, 90);
  assert.equal(value.vertical_speed_max_fpm, 2000);
  assert.equal(value.animation_ms, 1000);
  assert.equal(value.placements.airspeed, "right");
  assert.equal(value.placements.heading, "hidden");
  assert.equal(value.placements.turn, "right");
  assert.equal(Object.keys(value.placements).length, 6);
  value.placements.airspeed = "hidden";
  assert.equal(DEFAULT_INSTRUMENT_SETTINGS.placements.airspeed, "left");
});

test("speed units convert readings, scale, and every colored band without changing telemetry", () => {
  for (const speed_unit of ["knots", "kmh", "mps"]) {
    const settings = normalize_instrument_settings({
      speed_unit,
      speed_max_knots: 300,
    });
    const props = flight_instrument_props(
      "airspeed",
      PREVIEW_FLIGHT_STATE,
      settings,
    );
    const factor = speed_from_knots(1, speed_unit);
    assert.equal(props.speed, 90 * factor);
    assert.equal(props.max, 300 * factor);
    assert.equal(props.arcs.red, 163 * factor);
    assert.deepEqual(props.arcs.white, [33 * factor, 85 * factor]);
    assert.deepEqual(props.arcs.green, [44 * factor, 129 * factor]);
    assert.deepEqual(props.arcs.yellow, [129 * factor, 163 * factor]);
    assert.ok(Math.abs(speed_to_knots(props.speed, speed_unit) - 90) < 1e-10);
  }
  assert.equal(PREVIEW_FLIGHT_STATE.airspeed_knots, 90);
});

test("pressure units and instrument ranges affect presentation while retaining canonical state", () => {
  const settings = normalize_instrument_settings({
    pressure_unit: "inHg",
    pitch_limit_deg: 60,
    vertical_speed_max_fpm: 4000,
  });
  const altitude = flight_instrument_props(
    "altitude",
    PREVIEW_FLIGHT_STATE,
    settings,
  );
  assert.equal(altitude.pressure, 1013 / HPA_PER_INHG);
  assert.equal(altitude.pressureUnit, "inHg");
  assert.equal(altitude.altitude, 2500);
  assert.equal(
    flight_instrument_props("attitude", PREVIEW_FLIGHT_STATE, settings)
      .pitchLimit,
    60,
  );
  assert.equal(
    flight_instrument_props("vertical_speed", PREVIEW_FLIGHT_STATE, settings)
      .max,
    4000,
  );
  assert.equal(PREVIEW_FLIGHT_STATE.pressure_hpa, 1013);
});

test("custom instrument counts fit normal and compact bounds, including all instruments on one side", () => {
  for (const [width, height] of [
    [1200, 700],
    [768, 500],
    [390, 650],
    [320, 320],
    [900, 300],
    [1920, 1080],
  ]) {
    for (const placement of ["left", "right", "hidden"]) {
      const settings = normalize_instrument_settings({
        size: "large",
        placements: Object.fromEntries(
          FLIGHT_INSTRUMENT_CODES.map((code) => [code, placement]),
        ),
      });
      const layout = game_controls_layout(width, height, settings);
      const groups = layout.groups.filter((group) => group.count);
      assert.equal(
        groups.reduce((sum, group) => sum + group.count, 0),
        placement === "hidden" || layout.limited ? 0 : 6,
      );
      for (const group of groups) {
        const group_width =
          group.columns * layout.instrument_size + (group.columns - 1) * 8;
        const available_width = layout.compact
          ? width - 32
          : (width - 32 - layout.controller_width - 48) / 2;
        assert.ok(group_width <= available_width + 0.01, `${width} width`);
      }
      const heights = groups.map(
        (group) =>
          group.rows * (layout.instrument_size + 16) + (group.rows - 1) * 8,
      );
      const dock_height =
        (layout.visible || layout.limited ? 24 : 0) +
        (layout.compact
          ? heights.reduce((sum, h) => sum + h, 0) +
            groups.length * 8 +
            layout.controller_height
          : Math.max(layout.controller_height, ...heights));
      assert.ok(dock_height + 16 <= height - 32, `${width}x${height} height`);
    }
  }
  const hidden = game_controls_layout(
    1200,
    700,
    normalize_instrument_settings({ visible: false }),
  );
  assert.equal(hidden.visible, false);
  assert.ok(hidden.groups.every((group) => group.count === 0));
});

test("every placement combination stays inside short, compact, and fullscreen game bounds", () => {
  for (const [width, height] of [
    [240, 200],
    [320, 240],
    [390, 300],
    [600, 300],
    [767, 500],
    [768, 300],
    [1200, 700],
    [1920, 1080],
  ]) {
    for (let mask = 0; mask < 729; mask++) {
      let choices = mask;
      const placements = Object.fromEntries(
        FLIGHT_INSTRUMENT_CODES.map((code) => {
          const side = ["left", "right", "hidden"][choices % 3];
          choices = Math.floor(choices / 3);
          return [code, side];
        }),
      );
      const preferences = normalize_instrument_settings({
        size: "large",
        placements,
      });
      const layout = game_controls_layout(width, height, preferences);
      const groups = layout.groups.filter((group) => group.count);
      const heights = groups.map(
        (group) =>
          group.rows * (layout.instrument_size + 16) + (group.rows - 1) * 8,
      );
      const dock_height =
        (layout.visible || layout.limited ? 24 : 0) +
        (layout.compact
          ? heights.reduce((sum, h) => sum + h, 0) +
            groups.length * 8 +
            layout.controller_height
          : Math.max(layout.controller_height, ...heights));
      assert.ok(
        dock_height + 16 <= height - 32 + 0.01,
        `${width}x${height} placement ${mask}`,
      );
      if (layout.limited) {
        assert.equal(groups.length, 0);
        assert.deepEqual(preferences.placements, placements);
      } else if (layout.visible) assert.ok(layout.instrument_size >= 48);
    }
  }
});

test("cramped game areas preserve selection and automatically restore gauges when space returns", () => {
  const settings = normalize_instrument_settings({ size: "large" });
  const before = JSON.stringify(settings);
  const cramped = game_controls_layout(320, 240, settings);
  assert.equal(cramped.limited, true);
  assert.equal(cramped.visible, false);
  assert.ok(cramped.groups.every((group) => group.count === 0));
  assert.ok(cramped.controller_width > 0);
  const restored = game_controls_layout(1200, 700, settings);
  assert.equal(restored.limited, false);
  assert.equal(restored.visible, true);
  assert.equal(
    restored.groups.reduce((sum, group) => sum + group.count, 0),
    6,
  );
  assert.equal(JSON.stringify(settings), before);
});
