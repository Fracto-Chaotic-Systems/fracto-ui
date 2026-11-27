import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { transformSync } from "esbuild";
import { Fragment } from "react";

const source = readFileSync(
  new URL("../src/pages/games/InventoryCatalogPanel.jsx", import.meta.url),
  "utf8",
).replace(/^import[^;]+;\r?\n/gm, "");
const compiled = transformSync(source, {
  loader: "jsx",
  format: "cjs",
  jsx: "automatic",
}).code;
const require = createRequire(import.meta.url);

function fixture() {
  const state = [];
  let cursor = 0,
    saves = 0;
  const catalog = {
    record: {
      id: "grass",
      name: "Grass",
      description: "Meadow grass",
      folder_path: "plants",
      attribution: { creator_name: "Ada" },
      sources: [{ format: "fbx", path: "source/grass.fbx" }],
      history: [
        { date: "2026-11-20", action: "import", description: "Imported" },
      ],
    },
    folder_path: "plants",
    editing: false,
    busy: false,
    edit() {
      catalog.editing = true;
    },
    save(event) {
      event.preventDefault();
      saves++;
    },
    cancel() {
      catalog.editing = false;
    },
    reload() {},
    set_folder_path(value) {
      catalog.folder_path = value;
    },
  };
  const module = { exports: {} };
  runInNewContext(compiled, {
    module,
    exports: module.exports,
    require,
    Fragment,
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [
        state[index],
        (value) => {
          state[index] = value;
        },
      ];
    },
    useEffect: () => {},
    AppText: { get: (key) => key },
    INVENTORY_CATALOG_TEXT: new Proxy({}, { get: (_, key) => key }),
    ATTRIBUTION_FIELDS: ["creator_name"],
    safe_catalog_url: () => null,
    useInventoryCatalog: () => catalog,
    InventoryCatalogEditor: "editor",
    InventoryCatalogField: "field",
    CoolTabs: "tabs",
    CatalogPanel: "section",
    CatalogTab: "tab",
    CatalogActions: "div",
    CatalogMessage: "p",
  });
  const render = (props) => {
    cursor = 0;
    return module.exports.default({ asset_id: "grass", ...props });
  };
  const nodes = (element) => {
    if (!element || typeof element !== "object") return [];
    if (Array.isArray(element)) return Array.from(element).flatMap(nodes);
    const children = element.props?.children;
    return [
      element,
      ...nodes(element.props?.selected_content),
      ...(Array.isArray(children) ? Array.from(children) : [children]).flatMap(
        nodes,
      ),
    ];
  };
  const find = (tree, type, label) =>
    nodes(tree).find(
      (node) =>
        node.type === type &&
        (label === undefined ||
          node.props.title === label ||
          node.props.children === label),
    );
  const tabs = (tree) => nodes(tree).filter((node) => node.type === "tab");
  return { catalog, render, find, tabs, nodes, saves: () => saves };
}

test("catalog information is tabbed: details, source files, history and metadata", () => {
  const f = fixture();
  const metadata = { type: "metadata-panel", props: {} };
  const tree = f.render({ metadata });
  const header = f.find(tree, "tabs");
  assert.deepEqual(Array.from(header.props.labels), [
    "tab_details",
    "tab_sources",
    "tab_history",
    "tab_metadata",
  ]);
  assert.equal(header.props.tab_index, 0);
  const [details, sources, history, meta] = f.tabs(tree);
  assert.equal(details.props.hidden, false);
  assert.deepEqual(
    [sources, history, meta].map((tab) => tab.props.hidden),
    [true, true, true],
  );
  assert.ok(f.nodes(details).some((node) => node.type === "dl"));
  // No Edit/reload buttons or material title in the details tab.
  assert.equal(f.find(details, "button"), undefined);
  assert.equal(f.find(details, "strong", "Grass"), undefined);
  assert.equal(f.find(details, "p", "Meadow grass"), undefined);
  assert.equal(
    f.nodes(details).some((node) => node.type === "ul"),
    false,
  );
  assert.ok(f.nodes(sources).some((node) => node.type === "ul"));
  assert.ok(f.nodes(history).some((node) => node.type === "ol"));
  assert.equal(f.nodes(meta).includes(metadata), true);
  // Section headings are now the tab labels.
  assert.equal(f.find(tree, "h3"), undefined);
  // Only the tabs remain: no "Catalog information" heading or outlined box.
  assert.equal(f.find(tree, "h2"), undefined);
  assert.equal(tree.type, "section");
  assert.equal(tree.props.$bare, true);
  assert.equal(tree.props["aria-label"], "title");
});

test("switching tabs keeps every tab mounted, so open edits keep their drafts", () => {
  const f = fixture();
  // A recovered browser draft still opens the editor in the details tab.
  f.catalog.editing = true;
  f.find(f.render(), "tabs").props.on_tab_select(2);
  const tree = f.render();
  assert.equal(f.find(tree, "tabs").props.tab_index, 2);
  const [details, , history] = f.tabs(tree);
  assert.equal(details.props.hidden, true);
  assert.equal(history.props.hidden, false);
  assert.ok(f.nodes(details).some((node) => node.type === "editor"));
  assert.equal(f.saves(), 0);
});

test("pages without metadata get three tabs; a page can own the selected tab", () => {
  const f = fixture();
  const plain = f.render();
  assert.equal(f.find(plain, "tabs").props.labels.length, 3);
  assert.equal(f.tabs(plain).length, 3);
  const chosen = [];
  const shared = f.render({
    tab: 3,
    on_tab: (index) => chosen.push(index),
    metadata: { type: "metadata-panel", props: {} },
  });
  assert.equal(f.find(shared, "tabs").props.tab_index, 3);
  f.find(shared, "tabs").props.on_tab_select(1);
  assert.deepEqual(chosen, [1]);
  // A remembered metadata tab falls back to history where metadata is absent.
  assert.equal(f.find(f.render({ tab: 3 }), "tabs").props.tab_index, 2);
  assert.equal(f.tabs(f.render({ tab: 3 }))[2].props.hidden, false);
});

test("the catalog panel no longer offers Move to folder", () => {
  const f = fixture();
  assert.equal(f.find(f.render(), "button", "move_folder"), undefined);
  assert.equal(f.find(f.render(), "select"), undefined);
});
