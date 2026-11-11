import test from "node:test";
import { orbital_start_index } from "../src/pages/study/points/PointsOrbitalOrder.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";

const source = readFileSync(
  new URL("../src/pages/study/circuitry/CircuitryChart.jsx", import.meta.url),
  "utf8",
)
  .replace(/^import[\s\S]*?;\r?\n/gm, "")
  .replace("export class CircuitryChart", "class CircuitryChart")
  .replace("export default CircuitryChart;", "");
const harness = (props, storage) => {
  const calls = [],
    stops = [];
  const timers = new Map();
  const timer_delays = new Map();
  let timer_id = 0;
  const type = { isRequired: {} };
  const Chart = runInNewContext(
    transformSync(source, { loader: "jsx" }).code + ";CircuitryChart",
    {
      Component: class {
        constructor(props) {
          this.props = props;
        }
        setState(update, callback) {
          Object.assign(this.state, typeof update === "function" ? update(this.state, this.props) : update);
          callback?.();
        }
      },
      PropTypes: { object: type, number: type },
      ChartJS: { register() {} },
      registerables: [],
      orbital_start_index,
      TRANSPORT_BEGIN: "begin",
      TRANSPORT_END: "end",
      TRANSPORT_PAUSE: "pause",
      TRANSPORT_PLAY: "play",
      TRANSPORT_REVERSE: "reverse",
      CELL_TYPE_CALLBACK: "callback",
      KEY_STUDY_CIRCUITRY_ORBITAL_COORDINATES: "coordinates",
      load_playback_volume: () => 0.15,
      window: { localStorage: storage },
      CircuitryAudioController: class {
        stop() {
          stops.push(true);
        }
        dispose() {}
      },
      DataBackend: { get_circuitry: (...args) => calls.push(args) },
      build_chart_waveform_profile: (samples) => samples,
      normalize_waveform_profile: (samples) => samples,
      unwrap_waveform_profile: (samples) => samples,
      validate_waveform_continuity: () => ({ valid: true }),
      setInterval(callback, delay) {
        timers.set(++timer_id, callback);
        timer_delays.set(timer_id, delay);
        return timer_id;
      },
      clearInterval(id) { timers.delete(id); },
    },
  );
  return { chart: new Chart(props), calls, stops, timers, timer_delays };
};

test("circuitry follows selected orbital IDs, ignores old requests, and never detects an orbit while selection is empty", () => {
  const h = harness({
    focal_point: { x: 0, y: 0 },
    selected_orbital: { orbital_id: "1" },
  });
  h.chart.componentDidMount();
  assert.equal(h.calls[0][4], "1");
  const previous = h.chart.props;
  h.chart.props = { ...previous, selected_orbital: { orbital_id: "2" } };
  h.chart.componentDidUpdate(previous, { ...h.chart.state });
  assert.equal(h.calls[1][4], "2");
  const response = {
    result: [{ t: 0, C: { re: 1, im: 0 } }],
    orbital_points: [{ re: 1, im: 0 }],
    cardinality: 1,
    Q: { re: 0, im: 0 },
  };
  h.calls[0][1](response);
  assert.equal(h.chart.state.circuitry_data, null);
  h.calls[1][1]({ ...response, orbital_id: "2" });
  assert.equal(h.chart.state.circuitry_data.orbital_id, "2");
  const radial = { ...h.chart.state };
  h.chart.state.radial_sweep = false;
  h.chart.componentDidUpdate(h.chart.props, radial);
  assert.equal(h.calls[2][3], "hermite");
  assert.equal(h.calls[2][4], "2");
  const selected = h.chart.props;
  h.chart.props = { ...selected, selected_orbital: null };
  h.chart.componentDidUpdate(selected, { ...h.chart.state });
  assert.equal(h.calls.length, 3);
  assert.equal(h.chart.state.circuitry_data, null);
  h.calls[2][1](response);
  assert.equal(h.chart.state.circuitry_data, null);
  assert.ok(h.stops.length > 0);
  h.chart.componentWillUnmount();
});

const animation_response = (orbital_id, cardinality, subdivisions = 4) => {
  const orbital_points = Array.from({ length: cardinality }, (_, index) => ({ re: index + 1, im: 0 }));
  return {
    orbital_id, cardinality, orbital_points, Q: { re: 0, im: 0 },
    result: Array.from({ length: cardinality * subdivisions + 1 }, (_, index) => ({
      t: index / subdivisions,
      C: orbital_points[Math.floor(index / subdivisions) % cardinality],
    })),
  };
};

test("animation speed spans eighth to full speed and updates the live timer without moving the point", () => {
  const h = harness({ focal_point: { x: 0, y: 0 }, selected_orbital: { orbital_id: "1" } });
  h.chart.componentDidMount();
  h.calls[0][1](animation_response("1", 3));
  assert.equal(h.chart.state.animation_speed, 0.625);
  h.chart.start_animation(-1);
  h.chart.state.animation_index = 6;
  assert.equal(h.timer_delays.get(h.chart.animation_timer_handle), 16);
  for (const [value, delay] of [[12.5, 80], [25, 40], [100, 10], [62.5, 16]]) {
    h.chart.on_animation_speed_change({ target: { value: String(value) } });
    assert.equal(h.timers.size, 1);
    assert.equal(h.timer_delays.get(h.chart.animation_timer_handle), delay);
    assert.equal(h.chart.state.animation_index, 6);
    assert.equal(h.chart.state.animation_playing, true);
    assert.equal(h.chart.state.animation_direction, -1);
  }
  h.timers.get(h.chart.animation_timer_handle)();
  assert.equal(h.chart.state.animation_index, 5);
  h.chart.on_transport_operation("pause");
  h.chart.on_animation_speed_change({ target: { value: "25" } });
  assert.equal(h.timers.size, 0);
  assert.equal(h.chart.state.animation_playing, false);
  h.chart.start_animation(1);
  assert.equal(h.timer_delays.get(h.chart.animation_timer_handle), 40);
  h.chart.componentWillUnmount();
});

test("animation speed survives reloads with a midpoint default and safe storage fallback", () => {
  const saved = new Map();
  const storage = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
  };
  const h = harness({}, storage);
  assert.equal(h.chart.state.animation_speed, 0.625);
  h.chart.on_animation_speed_change({ target: { value: "45" } });
  const restored = harness({}, storage);
  assert.equal(restored.chart.state.animation_speed, 0.45);
  restored.chart.start_animation(1);
  assert.equal(restored.timer_delays.get(restored.chart.animation_timer_handle), 1000 / 45);
  restored.chart.componentWillUnmount();
  const key = [...saved.keys()][0];
  for (const value of ["", " ", "invalid", "Infinity"]) {
    saved.set(key, value);
    assert.equal(harness({}, storage).chart.state.animation_speed, 0.625);
  }
  saved.set(key, "0.1");
  assert.equal(harness({}, storage).chart.state.animation_speed, 0.125);
  saved.set(key, "2");
  assert.equal(harness({}, storage).chart.state.animation_speed, 1);
  const blocked = harness({}, {
    getItem() { throw new Error("Storage blocked"); },
    setItem() { throw new Error("Storage blocked"); },
  });
  assert.equal(blocked.chart.state.animation_speed, 0.625);
  blocked.chart.on_animation_speed_change({ target: { value: "50" } });
  assert.equal(blocked.chart.state.animation_speed, 0.5);
});

test("orbital switches preserve the live timer and direction, retaining phase only for matching periods", () => {
  for (const direction of [1, -1]) {
    const h = harness({ focal_point: { x: 0, y: 0 }, selected_orbital: { orbital_id: "1" } });
    h.chart.componentDidMount();
    h.calls[0][1](animation_response("1", 3));
    h.chart.start_animation(direction);
    h.chart.state.animation_index = 5;
    const timer = h.chart.animation_timer_handle;
    const select = (id) => {
      const previous = h.chart.props;
      h.chart.props = { ...previous, selected_orbital: { orbital_id: id } };
      h.chart.componentDidUpdate(previous, { ...h.chart.state });
    };
    select("2");
    assert.equal(h.chart.animation_timer_handle, timer);
    assert.equal(h.chart.state.animation_playing, true);
    h.timers.get(timer)();
    const live_index = h.chart.state.animation_index;
    h.calls[1][1](animation_response("2", 3));
    assert.equal(h.chart.state.animation_index, live_index);
    assert.equal(h.chart.state.animation_direction, direction);
    h.timers.get(timer)();
    assert.equal(h.chart.state.animation_index, live_index + direction);

    select("3");
    select("4");
    h.calls[2][1](animation_response("3", 8));
    assert.equal(h.chart.state.circuitry_data.orbital_id, "2");
    h.calls[3][1](animation_response("4", 5));
    assert.equal(h.chart.state.animation_index, 0);
    assert.equal(h.chart.state.selected_orbital_row, 0);
    assert.equal(h.chart.animation_timer_handle, timer);
    assert.equal(h.chart.state.animation_playing, true);
    h.timers.get(timer)();
    assert.equal(h.chart.state.animation_index, direction === 1 ? 1 : 20);

    select("5");
    h.chart.on_transport_operation("pause");
    h.calls[4][1](animation_response("5", 5));
    assert.equal(h.chart.animation_timer_handle, null);
    assert.equal(h.chart.state.animation_playing, false);
    h.chart.componentWillUnmount();
    assert.equal(h.timers.size, 0);
  }
});

test("matching periods retain interval position when sample density changes; deselection stops the timer", () => {
  const h = harness({ focal_point: { x: 0, y: 0 }, selected_orbital: { orbital_id: "1" } });
  h.chart.componentDidMount();
  h.calls[0][1](animation_response("1", 3));
  h.chart.start_animation(1);
  h.chart.state.animation_index = 6;
  const previous = h.chart.props;
  h.chart.props = { ...previous, selected_orbital: { orbital_id: "2" } };
  h.chart.componentDidUpdate(previous, { ...h.chart.state });
  h.calls[1][1](animation_response("2", 3, 8));
  assert.equal(h.chart.state.animation_index, 12);
  const selected = h.chart.props;
  h.chart.props = { ...selected, selected_orbital: null };
  h.chart.componentDidUpdate(selected, { ...h.chart.state });
  assert.equal(h.chart.animation_timer_handle, null);
  assert.equal(h.chart.state.animation_playing, false);
  assert.equal(h.chart.state.circuitry_data, null);
  assert.equal(h.timers.size, 0);
});

test("existing focal-only circuitry callers retain their detector request", () => {
  const h = harness({ focal_point: { x: 0.2, y: 0.3 } });
  h.chart.componentDidMount();
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0][4], undefined);
  h.chart.componentWillUnmount();
});

test("table point requests seek through rotated indices without restarting playback", () => {
  const h = harness({
    focal_point: { x: 0, y: 0 },
    selected_orbital: { orbital_id: "7", points: [0, 1, 2].map((point_index) => ({ point_index, landing_ratios: [{numerator: ["4", "1", "2"][point_index]}] })) },
  });
  h.chart.componentDidMount();
  const old_props = h.chart.props;
  h.chart.props = { ...old_props, point_selection_request: { orbital_id: "7", point_index: 0 } };
  h.chart.componentDidUpdate(old_props, { ...h.chart.state });
  assert.equal(h.chart.applied_point_selection, null);
  const response = animation_response("7", 3);
  response.orbital_points = [{ re: 4, im: 0 }, { re: 2, im: 0 }, { re: 3, im: 0 }];
  response.result = Array.from({ length: 13 }, (_, index) => ({ t: index / 4, C: response.orbital_points[Math.floor(index / 4) % 3] }));
  const previous = { ...h.chart.state };
  h.calls[0][1](response);
  h.chart.componentDidUpdate(h.chart.props, previous);
  assert.equal(h.chart.state.selected_orbital_row, 2);
  assert.equal(h.chart.state.animation_index, 8);
  assert.equal(h.chart.state.animation_playing, false);
  assert.equal(h.chart.state.selected_orbital_point.x, 4);
  h.chart.start_animation(-1);
  const timer = h.chart.animation_timer_handle;
  const before = h.chart.props;
  h.chart.props = { ...before, point_selection_request: { orbital_id: "7", point_index: 2 } };
  h.chart.componentDidUpdate(before, { ...h.chart.state });
  assert.equal(h.chart.state.animation_index, 4);
  assert.equal(h.chart.state.selected_orbital_row, 1);
  assert.equal(h.chart.animation_timer_handle, timer);
  h.chart.advance_animation(-1);
  h.chart.componentDidUpdate(h.chart.props, { ...h.chart.state });
  assert.equal(h.chart.state.animation_index, 3);
  // The same row can be clicked again as a new request.
  h.chart.props = { ...h.chart.props, point_selection_request: { orbital_id: "7", point_index: 2 } };
  h.chart.apply_point_selection();
  assert.equal(h.chart.state.animation_index, 4);
  h.chart.props = { ...h.chart.props, point_selection_request: { orbital_id: "previous", point_index: 0 } };
  h.chart.apply_point_selection();
  assert.equal(h.chart.state.animation_index, 4);
  h.chart.componentWillUnmount();
});

test("animation reports stored point identities after circuitry rotation", () => {
  const updates = [];
  const h = harness({
    focal_point: { x: 0, y: 0 },
    selected_orbital: { orbital_id: "7", points: [
      { point_index: 0, landing_ratios: [{numerator:"4"}] }, { point_index: 1, landing_ratios: [{numerator:"1"}] }, { point_index: 2, landing_ratios: [{numerator:"2"}] },
    ] },
    on_active_point_changed: (...args) => updates.push(args),
  });
  const points = [{ re: 4, im: 0 }, { re: 2, im: 0 }, { re: 3, im: 0 }];
  const data = h.chart.rotate_circuitry_to_origin({
    cardinality: 3,
    orbital_points: points,
    result: [...points, points[0]].map((C, t) => ({ C, t })),
  });
  assert.deepEqual(Array.from(data.orbital_point_indices), [1, 2, 0]);
  h.chart.state.circuitry_data = data;
  for (const row of [0, 1, 2]) {
    const previous = { ...h.chart.state };
    h.chart.on_orbital_point_selected(row);
    h.chart.componentDidUpdate(h.chart.props, previous);
    assert.deepEqual(updates.at(-1), ["7", [1, 2, 0][row], false]);
  }
  for (const direction of [1, -1]) {
    const visited = new Set();
    for (let frame = 0; frame < data.result.length; frame++) {
      const previous = { ...h.chart.state };
      h.chart.advance_animation(direction);
      h.chart.componentDidUpdate(h.chart.props, previous);
      const row = h.chart.state.selected_orbital_row;
      assert.deepEqual(updates.at(-1), ["7", data.orbital_point_indices[row], false]);
      visited.add(updates.at(-1)[1]);
    }
    assert.equal(visited.size, 3);
  }
  assert.equal(h.chart.get_animation_orbital_row(data.result.length - 1), 0);
  const stopped = { ...h.chart.state };
  h.chart.start_animation(1);
  h.chart.componentDidUpdate(h.chart.props, stopped);
  assert.equal(updates.at(-1)[2], true);
  const playing = { ...h.chart.state };
  h.chart.on_transport_operation("pause");
  h.chart.componentDidUpdate(h.chart.props, playing);
  assert.equal(updates.at(-1)[2], false);
});
