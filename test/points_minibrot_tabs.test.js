import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import React from "react";

function harness() {
  const source = readFileSync(
    new URL(
      "../src/pages/study/points/PointsMinibrotTabs.jsx",
      import.meta.url,
    ),
    "utf8",
  )
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace(
      "export default class PointsMinibrotTabs",
      "class PointsMinibrotTabs",
    );
  let resize;
  let disconnected = false;
  const Tabs = runInNewContext(
    transformSync(source, { loader: "jsx" }).code + ";PointsMinibrotTabs",
    {
      React,
      Component: class {
        setState(next) {
          Object.assign(this.state, next);
        }
      },
      styled: { div: () => "div" },
      AppText: { get: (key) => key },
      KEY_STUDY_POINTS_FREE_TAB: "free",
      KEY_INLINE_TITLE: "inline",
      KEY_NODES_TITLE: "nodal",
      BAILIWICK_TYPE_FREEFORM: "bailiwick_type_freeform",
      BAILIWICK_TYPE_INLINE: "bailiwick_type_inline",
      BAILIWICK_TYPE_NODES: "bailiwick_type_nodes",
      CoolTabs: "tabs",
      MinibrotList: "list",
      ResizeObserver: class {
        constructor(callback) {
          resize = callback;
        }
        observe(viewport) {
          assert.ok(viewport);
        }
        disconnect() {
          disconnected = true;
        }
      },
      console,
    },
  );
  const tabs = new Tabs();
  const selections = [];
  tabs.props = {
    on_select_minibrot: (selection) => selections.push(selection),
  };
  const viewport = { clientHeight: 220 };
  tabs.viewport_ref.current = viewport;
  tabs.componentDidMount();
  return {
    tabs,
    viewport,
    resize: () => resize(),
    disconnected: () => disconnected,
    selections,
  };
}

test("middle-section tabs map free, inline, and nodal to distinct keyed MinibrotList types", () => {
  const { tabs } = harness();
  const control = tabs.render().props.children;
  assert.deepEqual(Array.from(control.props.labels), [
    "free",
    "inline",
    "nodal",
  ]);
  assert.equal(control.props.tab_index, 0);
  assert.equal(control.props.fill_height, true);
  const expected = [
    "bailiwick_type_freeform",
    "bailiwick_type_inline",
    "bailiwick_type_nodes",
  ];
  expected.forEach((type, index) => {
    control.props.on_tab_select(index);
    const list = tabs.render_tab_content();
    assert.equal(list.type, "list");
    assert.equal(list.key, type);
    assert.equal(list.props.bailiwick_type, type);
    assert.equal(list.props.ready, true);
    assert.equal(list.props.height_px, 220);
    const selected = { id: index + 1 };
    list.props.on_select_minibrot(selected);
    assert.equal(tabs.state.selected_minibrot, selected);
  });
  tabs.on_tab_select(0);
  assert.equal(tabs.state.selected_minibrot, null);
  tabs.componentWillUnmount();
});

test("tab changes clear the outer selection and ignore callbacks from the previous list", () => {
  const { tabs, selections } = harness();
  const old_list = tabs.render_tab_content();
  old_list.props.on_select_minibrot({ id: 55 });
  assert.equal(selections.at(-1).id, 55);
  tabs.on_tab_select(1);
  assert.equal(selections.at(-1), null);
  old_list.props.on_select_minibrot({ id: 99 });
  assert.equal(selections.at(-1), null);
  const current_list = tabs.render_tab_content();
  current_list.props.on_select_minibrot({ id: 56 });
  assert.equal(selections.at(-1).id, 56);
  tabs.componentWillUnmount();
  current_list.props.on_select_minibrot({ id: 100 });
  assert.equal(selections.at(-1).id, 56);
});

test("list height follows its available viewport and the observer is cleaned up", () => {
  const h = harness();
  assert.equal(h.tabs.render_tab_content().props.height_px, 220);
  h.viewport.clientHeight = 95;
  h.resize();
  assert.equal(h.tabs.render_tab_content().props.height_px, 95);
  h.viewport.clientHeight = 0;
  h.resize();
  assert.equal(h.tabs.render_tab_content().props.height_px, 0);
  h.tabs.componentWillUnmount();
  assert.equal(h.disconnected(), true);
});
