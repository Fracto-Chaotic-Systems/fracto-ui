import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import React from "react";

function harness() {
  const source = readFileSync(
    new URL(
      "../src/pages/study/minibrots/MinibrotStudyTabs.jsx",
      import.meta.url,
    ),
    "utf8",
  )
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace(
      "export default class MinibrotStudyTabs",
      "class MinibrotStudyTabs",
    );
  const prop = () => prop;
  prop.isRequired = prop;
  const CircuitryChart = () => null,
    MinibrotContextCanvas = () => null,
    SeedSurveyDetect = () => null;
  const Tabs = runInNewContext(
    transformSync(source, { loader: "jsx" }).code + ";MinibrotStudyTabs",
    {
      React,
      Component: class {
        constructor(props) {
          this.props = props;
        }
        setState(next) {
          Object.assign(this.state, next);
        }
      },
      PropTypes: new Proxy({}, { get: () => prop }),
      AppText: { get: (key) => key },
      KEY_STUDY_MINIBROT_ORBITAL_TAB: "orbital",
      KEY_STUDY_MINIBROT_RAY_PATHS_TAB: "ray paths",
      KEY_STUDY_MINIBROT_SEEDS_TAB: "seeds",
      CircuitryChart,
      MinibrotContextCanvas,
      SeedSurveyDetect,
      CoolTabs: () => null,
      console,
    },
  );
  return {
    tabs: new Tabs({
      selected_minibrot: {
        id: 1,
        pattern: 3,
        core_point: JSON.stringify({ x: -0.12, y: 0.74 }),
        display_settings: JSON.stringify({
          focal_point: { x: -0.2, y: 0.7 },
          scope: 0.1,
        }),
      },
      width_px: 900,
    }),
    CircuitryChart,
    MinibrotContextCanvas,
    SeedSurveyDetect,
  };
}

test("orbital is the first default tab and reuses circuitry at the record core", () => {
  const h = harness();
  const layout = h.tabs.render().props.children;
  assert.deepEqual(Array.from(layout.props.labels), [
    "orbital",
    "ray paths",
    "seeds",
  ]);
  assert.equal(layout.props.tab_index, 0);
  const orbital = h.tabs.render_tab_content();
  assert.equal(orbital.type, h.CircuitryChart);
  assert.deepEqual({ ...orbital.props.focal_point }, { x: -0.12, y: 0.74 });
  assert.equal(orbital.props.width_px, 876);
  assert.equal(orbital.props.height_px, 600);
});

test("ray tab preserves the saved view and selected-record identity", () => {
  const h = harness();
  h.tabs.on_tab_select(1);
  const ray = h.tabs.render_tab_content();
  assert.equal(ray.type, h.MinibrotContextCanvas);
  assert.deepEqual({ ...ray.props.focal_point }, { x: -0.2, y: 0.7 });
  assert.deepEqual({ ...ray.props.core_point }, { x: -0.12, y: 0.74 });
  assert.ok(Math.abs(ray.props.scope - 0.3) < 1e-12);
  assert.equal(ray.props.period, 3);
  const old_key = ray.key;
  h.tabs.props = {
    ...h.tabs.props,
    selected_minibrot: {
      ...h.tabs.props.selected_minibrot,
      id: 2,
      core_point: '{"x":-1,"y":0}',
    },
  };
  assert.notEqual(h.tabs.render_tab_content().key, old_key);
  h.tabs.on_tab_select(0);
  assert.deepEqual(
    { ...h.tabs.render_tab_content().props.focal_point },
    {
      x: -1,
      y: 0,
    },
  );
});

test("seeds tab reuses the scrolling detect component at the selected core", () => {
  const h = harness();
  h.tabs.on_tab_select(2);
  const seeds = h.tabs.render_tab_content();
  assert.equal(seeds.type, h.SeedSurveyDetect);
  assert.deepEqual({ ...seeds.props.focal_point }, { x: -0.12, y: 0.74 });
  assert.equal(seeds.props.width_px, 876);
  assert.equal(seeds.props.height_px, 600);
  h.tabs.props = {
    ...h.tabs.props,
    selected_minibrot: {
      ...h.tabs.props.selected_minibrot,
      id: 2,
      core_point: '{"x":-1,"y":0}',
    },
  };
  const next = h.tabs.render_tab_content();
  assert.notEqual(next.key, seeds.key);
  assert.deepEqual({ ...next.props.focal_point }, { x: -1, y: 0 });
});
