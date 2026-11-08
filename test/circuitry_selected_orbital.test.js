import test from "node:test";
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
const harness = (props) => {
  const calls = [],
    stops = [];
  const type = { isRequired: {} };
  const Chart = runInNewContext(
    transformSync(source, { loader: "jsx" }).code + ";CircuitryChart",
    {
      Component: class {
        constructor(props) {
          this.props = props;
        }
        setState(update, callback) {
          Object.assign(this.state, update);
          callback?.();
        }
      },
      PropTypes: { object: type, number: type },
      ChartJS: { register() {} },
      registerables: [],
      TRANSPORT_BEGIN: "begin",
      TRANSPORT_END: "end",
      TRANSPORT_PAUSE: "pause",
      TRANSPORT_PLAY: "play",
      TRANSPORT_REVERSE: "reverse",
      CELL_TYPE_CALLBACK: "callback",
      KEY_STUDY_CIRCUITRY_ORBITAL_COORDINATES: "coordinates",
      DEFAULT_PLAYBACK_VOLUME: 0.15,
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
      clearInterval() {},
    },
  );
  return { chart: new Chart(props), calls, stops };
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

test("existing focal-only circuitry callers retain their detector request", () => {
  const h = harness({ focal_point: { x: 0.2, y: 0.3 } });
  h.chart.componentDidMount();
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0][4], undefined);
  h.chart.componentWillUnmount();
});
