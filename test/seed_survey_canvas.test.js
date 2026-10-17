import test from "node:test";
import { Buffer } from "node:buffer";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import * as buffer from "../src/pages/assets/surveys/SeedSurveyCanvasBuffer.js";
const load = (file, names, globals) => {
  const source = readFileSync(
    new URL(`../src/pages/assets/surveys/${file}`, import.meta.url),
    "utf8",
  );
  const code = transformSync(
    source
      .replace(/^import[\s\S]*?;\r?\n/gm, "")
      .replace(/^export \{[\s\S]*?\} from .*;$/gm, "")
      .replace(/^export default .*;$/gm, "")
      .replace(/^export (const|class) /gm, "$1 "),
    { loader: "jsx" },
  ).code;
  return vm.runInNewContext(`${code}\n({${names.join(",")}})`, globals);
};
const batch = (size, row_start, records) => {
  const bytes = Buffer.alloc(size * 13);
  records.forEach(([status, pattern, iterations], column) => {
    const offset = column * 13;
    bytes.writeUInt8(status, offset);
    bytes.writeUInt32LE(pattern, offset + 1);
    bytes.writeFloatLE(0.5, offset + 5);
    bytes.writeUInt32LE(iterations, offset + 9);
  });
  return { row_start, row_count: 1, data: bytes.toString("base64") };
};
const context = () => ({
  fillStyle: "",
  fills: [],
  fillRect(...args) {
    this.fills.push([this.fillStyle, ...args]);
  },
});

test("packed rows preserve column orientation, absolute row offsets, and zero-status cells", () => {
  const cache = {
    canvas_buffer: Array.from({ length: 2 }, () => Array(3).fill(null)),
  };
  cache.canvas_buffer[1][2] = [7, 8];
  buffer.store_packed_rows(
    cache,
    batch(2, 2, [
      [1, 300, 100001],
      [0, 0, 0],
    ]),
    2,
  );
  assert.deepEqual(cache.canvas_buffer[0][2], [300, 100001]);
  assert.deepEqual(cache.canvas_buffer[1][2], [7, 8]);
  assert.equal(cache.canvas_buffer[0][0], null);
  buffer.store_canvas_rows(cache, null, {
    rows: [
      {
        row_index: 1,
        values: [
          [2, 9],
          [3, 10],
        ],
      },
    ],
  });
  assert.deepEqual(cache.canvas_buffer[1][1], [3, 10]);
  const complete = [[[4, 11]]];
  buffer.store_canvas_rows(cache, complete, null);
  assert.equal(cache.canvas_buffer, complete);
});

const harness = (overrides = {}) => {
  const starts = [],
    polls = [],
    timers = new Map(),
    created = [],
    painted = [];
  const type = () => type;
  type.isRequired = type;
  const { SeedSurveyCanvas } = load(
    "SeedSurveyCanvas.jsx",
    ["SeedSurveyCanvas"],
    {
      ...buffer,
      Component: class {
        constructor(props) {
          this.props = props;
        }
        setState(update, callback) {
          const previous = this.state;
          this.state = {
            ...previous,
            ...(typeof update === "function" ? update(previous) : update),
          };
          if (this.is_mounted) this.componentDidUpdate(this.props, previous);
          callback?.();
        }
      },
      React: {
        createElement: (type, props, ...children) => ({
          type,
          props,
          children,
        }),
        createRef: () => ({ current: null }),
      },
      PropTypes: new Proxy({}, { get: () => type }),
      AppText: { get: (key) => key },
      KEY_ASSETS_SURVEYS_FAILED: "failed",
      KEY_ASSETS_SURVEYS_SAMPLES: "samples",
      DataBackend: {
        start_seed_survey: (...args) => starts.push(args),
        get_seed_survey_job: (...args) => polls.push(args),
      },
      setTimeout: (callback) => {
        const id = Symbol();
        timers.set(id, callback);
        return id;
      },
      clearTimeout: (id) => timers.delete(id),
      canvas_buffer_cache: (key, size) => {
        created.push([key, size]);
        return {
          cache_key: key,
          source_canvas: { width: size },
          canvas_buffer: Array.from({ length: size }, () =>
            Array(size).fill(null),
          ),
        };
      },
      paint_canvas_buffer: (cache, context, source, display) =>
        painted.push([source, display]),
    },
  );
  const component = new SeedSurveyCanvas({
    source_size_px: 3,
    size_px: 17,
    focal_point: { x: 0.1, y: 0.2 },
    half_span: 1.5,
    iteration_limit: 100000,
    aria_label: "Caller label",
    ...overrides,
  });
  component.canvas_ref.current = { getContext: () => context() };
  component.componentDidMount();
  const update = (props) => {
    const previous = component.props;
    component.props = { ...previous, ...props };
    component.componentDidUpdate(previous, component.state);
  };
  const tick = () => {
    const [id, callback] = timers.entries().next().value;
    timers.delete(id);
    callback();
  };
  return { component, starts, polls, timers, created, painted, update, tick };
};

test("canvas owns submissions while display and unchanged-coordinate updates retain the job", () => {
  const h = harness({ focal_point: null });
  assert.equal(h.starts.length, 0);
  h.update({ focal_point: { x: 0.1, y: 0.2 } });
  assert.equal(h.starts.length, 1);
  const cache = h.component.canvas_buffer_cache;
  h.update({ size_px: 29, focal_point: { x: 0.1, y: 0.2 } });
  assert.equal(h.starts.length, 1);
  assert.equal(h.component.canvas_buffer_cache, cache);
  assert.equal(
    h.component.render().children[0].props["aria-label"],
    "Caller label",
  );
  h.update({ source_size_px: 4 });
  h.update({ half_span: 0.5 });
  h.update({ iteration_limit: 1000000 });
  assert.equal(h.starts.length, 4);
  assert.deepEqual(h.starts.at(-1).slice(1, 4), [4, 0.5, 1000000]);
  assert.equal(h.starts.at(-1)[5].canvas_size, 29);
  h.update({ sampling: "centers", encoding: "packed" });
  assert.equal(h.starts.length, 5);
  assert.equal(h.starts.at(-1)[5].encoding, "packed");
  h.component.canvas_ref.current = null;
  assert.doesNotThrow(() => h.component.paint_canvas(true));
});

test("canvas accumulates decoded rows and drains completed jobs using its own cursor", () => {
  const h = harness();
  h.starts[0][4]({ result: { job_id: "job", status: "queued" } });
  h.tick();
  assert.equal(h.polls[0][2], 0);
  h.polls[0][1]({
    status: "completed",
    preview_rows_completed: 3,
    canvas_buffer_batch: {
      row_start: 0,
      row_count: 1,
      rows: [{ row_index: 0, values: [[2, 7]] }],
    },
  });
  assert.equal(h.component.state.after_row, 1);
  h.tick();
  assert.equal(h.polls[1][2], 1);
  h.polls[1][1]({
    status: "completed",
    preview_rows_completed: 3,
    canvas_buffer_batch: {
      row_start: 1,
      row_count: 2,
      rows: [
        { row_index: 1, values: [[3, 8]] },
        { row_index: 2, values: [[4, 9]] },
      ],
    },
  });
  assert.deepEqual(h.component.canvas_buffer_cache.canvas_buffer[0], [
    [2, 7],
    [3, 8],
    [4, 9],
  ]);
  assert.equal(h.component.state.after_row, 3);
  assert.equal(h.timers.size, 0);
});

test("canvas accumulates packed batches with no mode or size assumptions", () => {
  const h = harness();
  h.starts[0][4]({ result: { job_id: "job", status: "queued" } });
  h.tick();
  h.polls[0][1]({
    status: "completed",
    render_rows_completed: 2,
    render_batch: batch(3, 0, [[1, 4, 99]]),
  });
  const cache = h.component.canvas_buffer_cache;
  h.tick();
  assert.equal(h.polls[1][2], 1);
  h.polls[1][1]({
    status: "completed",
    render_rows_completed: 2,
    render_batch: batch(3, 1, [[1, 5, 100]]),
  });
  assert.equal(h.component.canvas_buffer_cache, cache);
  assert.deepEqual(Array.from(cache.canvas_buffer[0][0]), [4, 99]);
  assert.deepEqual(Array.from(cache.canvas_buffer[0][1]), [5, 100]);
  assert.equal(h.timers.size, 0);
});

test("replaced requests and unmounted canvases reject late responses and clear polling", () => {
  const h = harness();
  const old = h.starts[0][4];
  h.update({ focal_point: { x: 0.3, y: 0.2 } });
  old({ error: "stale failure" });
  assert.equal(h.component.state.survey.status, "queued");
  h.starts[1][4]({ result: { job_id: "job", status: "running" } });
  h.tick();
  h.polls[0][1]({ status: "running" });
  assert.equal(h.timers.size, 1);
  h.component.componentWillUnmount();
  assert.equal(h.timers.size, 0);
  h.polls[0][1]({ status: "completed" });
  assert.equal(h.component.state.survey.status, "running");
});

test("failed submissions stop polling and invalid focal points invalidate the active job", () => {
  const h = harness();
  h.starts[0][4]({ error: "offline" });
  assert.equal(h.component.state.survey.status, "failed");
  assert.equal(h.timers.size, 0);
  h.update({ focal_point: null });
  assert.equal(h.component.state.survey.status, "idle");
  h.starts[0][4]({ result: { job_id: "late" } });
  assert.equal(h.timers.size, 0);
});
