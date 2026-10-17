import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { parse } from "@babel/parser";
import { transformSync } from "esbuild";

const source = readFileSync(
  new URL("../src/pages/assets/surveys/SeedSurveyRender.jsx", import.meta.url),
  "utf8",
);

const harness = (focal_point = { x: 0.1, y: 0.2 }) => {
  const starts = [],
    polls = [],
    timers = new Map(),
    writes = [];
  const globals = {};
  for (const node of parse(source, { sourceType: "module", plugins: ["jsx"] })
    .program.body) {
    if (node.type === "ImportDeclaration") {
      for (const specifier of node.specifiers)
        globals[specifier.local.name] = specifier.local.name;
    }
  }
  const prop_type = () => prop_type;
  prop_type.isRequired = prop_type;
  Object.assign(globals, {
    Component: class {
      constructor(props) {
        this.props = props;
      }
      setState(update, callback) {
        Object.assign(
          this.state,
          typeof update === "function" ? update(this.state) : update,
        );
        callback?.();
      }
    },
    React: {
      createElement: (type, props, ...children) => ({ type, props, children }),
    },
    PropTypes: new Proxy({}, { get: () => prop_type }),
    AppSettings: {
      get: () => undefined,
      on_settings_changed: (values) => writes.push(values),
    },
    AppText: { get: (key) => key },
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
  });
  const code = transformSync(
    source
      .replace(/^import[\s\S]*?;\r?\n/gm, "")
      .replace(/^export default .*;$/gm, "")
      .replace(/^export class /gm, "class "),
    { loader: "jsx" },
  ).code;
  const Render = vm.runInNewContext(`${code}\nSeedSurveyRender`, globals);
  const component = new Render({ focal_point, width_px: 500, height_px: 400 });
  const update = (props) => {
    const previous = component.props;
    component.props = { ...previous, ...props };
    component.componentDidUpdate(previous);
  };
  return { component, starts, polls, timers, writes, update };
};

const find_canvas = (node) => {
  if (node?.type === "SeedSurveyCanvas") return node;
  return node?.children?.map(find_canvas).find(Boolean);
};

test("controls pass focal point and request parameters to canvas and persist slider values", () => {
  const h = harness();
  let canvas = find_canvas(h.component.render());
  assert.equal(canvas.props.source_size_px, 121);
  assert.equal(canvas.props.size_px, 255);
  assert.equal(canvas.props.focal_point, h.component.props.focal_point);
  h.component.on_mode_change("render");
  h.component.on_half_span_change({ target: { value: -1 } });
  h.component.on_iteration_limit_change({ target: { value: 6 } });
  canvas = find_canvas(h.component.render());
  assert.equal(canvas.props.source_size_px, 1024);
  assert.equal(canvas.props.size_px, 1024);
  assert.equal(canvas.props.half_span, 0.5);
  assert.equal(canvas.props.iteration_limit, 1000000);
  assert.equal(h.writes.length, 2);
  assert.equal(h.starts.length, 0, "caller does not submit jobs");
  assert.equal(h.component.state.seed_survey, undefined);
});
