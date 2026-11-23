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
  let moving = false,
    saves = 0,
    cancels = 0;
  const catalog = {
    record: {
      id: "grass",
      name: "Grass",
      folder_path: "plants",
      attribution: {},
      sources: [],
      history: [],
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
      cancels++;
      catalog.editing = false;
    },
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
    useState: () => [
      moving,
      (value) => {
        moving = value;
      },
    ],
    useEffect: () => {},
    AppText: { get: (key) => key },
    INVENTORY_CATALOG_TEXT: new Proxy({}, { get: (_, key) => key }),
    ATTRIBUTION_FIELDS: [],
    useInventoryCatalog: () => catalog,
    InventoryCatalogEditor: "editor",
    CatalogPanel: "section",
    CatalogActions: "div",
    CatalogMessage: "p",
    CatalogMoveForm: "form",
    CoolIconLink: "icon",
    check_icon: "check",
    cancel_icon: "x",
  });
  const render = () =>
    module.exports.default({
      asset_id: "grass",
      folders: ["trees", "plants", "plants"],
    });
  const nodes = (element) => {
    if (!element || typeof element !== "object") return [];
    const children = Array.isArray(element.props?.children)
      ? element.props.children
      : [element.props?.children];
    return [
      element,
      ...children.flatMap((child) =>
        Array.isArray(child) ? child.flatMap(nodes) : nodes(child),
      ),
    ];
  };
  const find = (tree, type, title) =>
    nodes(tree).find(
      (node) =>
        node.type === type &&
        (title === undefined ||
          node.props.title === title ||
          node.props.children === title),
    );
  const open = () => {
    find(render(), "button", "move_folder").props.onClick();
    return find(render(), "form");
  };
  return {
    catalog,
    render,
    find,
    open,
    saves: () => saves,
    cancels: () => cancels,
    nodes,
  };
}

test("moving uses a green submit check and red cancel X after the folder selector", () => {
  const f = fixture(),
    form = f.open();
  assert.deepEqual(
    Array.from(form.props.children, (child) => child.type),
    ["label", "icon", "icon"],
  );
  const check = f.find(form, "icon", "move_folder"),
    cancel = f.find(form, "icon", "cancel");
  assert.equal(check.props.icon, "check");
  assert.equal(check.props.color, "#17803d");
  assert.equal(check.props.type, "submit");
  assert.equal(cancel.props.icon, "x");
  assert.equal(cancel.props.color, "#c62828");
  assert.equal(f.find(form, "button"), undefined);
  assert.deepEqual(
    f
      .nodes(form)
      .filter((node) => node.type === "option")
      .map((node) => node.props.value),
    ["", "plants", "trees"],
  );
  f.find(form, "select").props.onChange({ target: { value: "trees" } });
  assert.equal(f.catalog.folder_path, "trees");
  assert.equal(f.saves(), 0);
  f.find(f.render(), "form").props.onSubmit({ preventDefault() {} });
  assert.equal(f.saves(), 1);
});

test("move X and Escape cancel without saving; busy moves block both controls", () => {
  const f = fixture();
  let form = f.open();
  f.find(form, "icon", "cancel").props.on_click();
  assert.equal(f.cancels(), 1);
  assert.equal(f.saves(), 0);
  assert.equal(f.find(f.render(), "form"), undefined);
  form = f.open();
  form.props.onKeyDown({ key: "Escape", preventDefault() {} });
  assert.equal(f.cancels(), 2);
  assert.equal(f.saves(), 0);
  f.open();
  f.catalog.busy = true;
  form = f.find(f.render(), "form");
  assert.equal(f.find(form, "icon", "move_folder").props.disabled, true);
  assert.equal(f.find(form, "icon", "cancel").props.disabled, true);
  assert.equal(f.find(form, "select").props.disabled, true);
  form.props.onKeyDown({ key: "Escape", preventDefault() {} });
  assert.equal(f.cancels(), 2);
});
