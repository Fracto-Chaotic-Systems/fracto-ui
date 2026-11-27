import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { transformSync } from "esbuild";

const require = createRequire(import.meta.url);
const load = (file, globals) => {
  const source = readFileSync(
    new URL(`../src/pages/games/${file}`, import.meta.url),
    "utf8",
  )
    .replace(/^import[^;]+;\r?\n/gm, "")
    .replace("export default function", "module.exports.default = function");
  const module = { exports: {} };
  runInNewContext(
    transformSync(source, { loader: "jsx", format: "cjs", jsx: "automatic" })
      .code,
    { module, exports: module.exports, require, ...globals },
  );
  return module.exports.default;
};
function hooks() {
  const states = [];
  let cursor = 0;
  return {
    reset: () => (cursor = 0),
    value: (index) => states[index],
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [
        states[index],
        (value) => {
          states[index] =
            typeof value === "function" ? value(states[index]) : value;
        },
      ];
    },
  };
}
const nodes = (element) => {
  if (!element || typeof element !== "object") return [];
  const children = Array.isArray(element.props?.children)
    ? element.props.children
    : [element.props?.children];
  return [
    element,
    ...Array.from(children).flatMap((child) =>
      Array.isArray(child) ? child.flatMap(nodes) : nodes(child),
    ),
  ];
};
// The folder line renders inside its spacing/indent wrapper.
const row_of = (tree) => {
  assert.equal(tree.type, "folder-line");
  return tree.props.children;
};
const text_of = (node) =>
  typeof node === "string"
    ? node
    : Array.isArray(node)
      ? Array.from(node).map(text_of).join("")
      : node?.props
        ? text_of([node.props.children].flat())
        : "";
const find = (tree, type, predicate = () => true) =>
  nodes(tree).find((node) => node.type === type && predicate(node));

function move_fixture(fail = false) {
  const state = hooks();
  const requests = [];
  const component = load("ComponentFolderMove.jsx", {
    useState: state.useState,
    AppText: { get: (key) => key },
    INVENTORY_CATALOG_TEXT: new Proxy({}, { get: (_, key) => key }),
    COMPONENT_STAGE_TEXT: new Proxy({}, { get: (_, key) => key }),
    CatalogMoveForm: "form",
    InventoryNameRow: "row",
    InventoryFolderLine: "folder-line",
    CoolEditLink: "pencil",
    CoolIconLink: "icon",
    check_icon: "check-svg",
    cancel_icon: "cancel-svg",
    useInventoryFolders: (category) => {
      assert.equal(category, "component");
      return { folders: ["Plants", "Plants/Herbs"], error: false };
    },
    component_request: async (path, options) => {
      requests.push({ path, options });
      if (fail) throw new Error("request_error");
      return { id: "doc-1", folder_path: JSON.parse(options.body).folder_path };
    },
  });
  const moved = [];
  const render = (extra) => {
    state.reset();
    return component({
      id: "doc-1",
      folder_path: "",
      on_moved: async (path) => moved.push(path),
      ...extra,
    });
  };
  return { render, requests, moved };
}

test("Move to folder lists the component folders and sends the chosen folder", async () => {
  const f = move_fixture();
  const line = row_of(f.render());
  assert.equal(line.type, "row");
  const [label, pencil] = Array.from(line.props.children);
  assert.equal(text_of(label), "in_folder folder_root");
  assert.equal(
    Array.from([label.props.children].flat()).find(
      (child) => child?.type === "strong",
    ).props.children,
    "folder_root",
    "the folder name is bold",
  );
  assert.equal(pencil.type, "pencil");
  assert.equal(pencil.props.title, "move_folder");
  pencil.props.on_click();
  const tree = f.render();
  const options = nodes(find(tree, "select")).filter(
    (node) => node.type === "option",
  );
  assert.deepEqual(
    options.map((option) => option.props.value),
    ["", "Plants", "Plants/Herbs"],
  );
  assert.deepEqual(
    Array.from(find(tree, "form").props.children, (child) => child.type),
    ["label", "icon", "icon"],
  );
  assert.equal(Array.from(find(tree, "label").props.children)[0], "in_folder");
  assert.equal(
    find(tree, "icon", (node) => node.props.icon === "check-svg").props.color,
    "#17803d",
  );
  assert.equal(
    find(tree, "icon", (node) => node.props.icon === "cancel-svg").props.color,
    "#c62828",
  );
  find(tree, "select").props.onChange({ target: { value: "Plants/Herbs" } });
  await find(f.render(), "form").props.onSubmit({ preventDefault() {} });
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].path, "/doc-1/folder");
  assert.equal(f.requests[0].options.method, "PUT");
  assert.deepEqual(JSON.parse(f.requests[0].options.body), {
    folder_path: "Plants/Herbs",
  });
  assert.deepEqual(f.moved, ["Plants/Herbs"]);
  assert.equal(row_of(f.render()).type, "row");
});

test("Move to folder: unchanged choice, Cancel and Escape send nothing; failures keep the form", async () => {
  const f = move_fixture();
  Array.from(
    row_of(f.render({ folder_path: "Plants" })).props.children,
  )[1].props.on_click();
  assert.equal(
    find(f.render({ folder_path: "Plants" }), "select").props.value,
    "Plants",
  );
  await find(f.render({ folder_path: "Plants" }), "form").props.onSubmit({
    preventDefault() {},
  });
  assert.equal(f.requests.length, 0);
  Array.from(row_of(f.render()).props.children)[1].props.on_click();
  find(
    f.render(),
    "icon",
    (node) => node.props.icon === "cancel-svg",
  ).props.on_click();
  assert.equal(row_of(f.render()).type, "row");
  Array.from(row_of(f.render()).props.children)[1].props.on_click();
  let prevented = false;
  find(f.render(), "form").props.onKeyDown({
    key: "Escape",
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.equal(row_of(f.render()).type, "row");
  assert.equal(f.requests.length, 0);

  const failing = move_fixture(true);
  Array.from(row_of(failing.render()).props.children)[1].props.on_click();
  find(failing.render(), "select").props.onChange({
    target: { value: "Plants" },
  });
  await find(failing.render(), "form").props.onSubmit({ preventDefault() {} });
  const after = failing.render();
  assert.ok(find(after, "form"));
  assert.equal(find(after, "p").props.role, "alert");
  assert.deepEqual(failing.moved, []);
});

test("saved component documents load every page and default to the root folder", async () => {
  const state = hooks();
  const paths = [];
  let effect = null;
  const hook = load("useComponentDocuments.js", {
    useState: state.useState,
    useCallback: (callback) => callback,
    useEffect: (callback) => {
      effect = callback;
    },
    AbortController,
    component_request: async (path) => {
      paths.push(path);
      return path
        ? {
            documents: [{ id: "b", name: "B", revision: 1 }],
            next_cursor: null,
          }
        : {
            documents: [
              { id: "a", name: "A", revision: 2, folder_path: "Plants" },
            ],
            next_cursor: "a",
          };
    },
  });
  state.reset();
  const first = hook();
  assert.equal(first.loading, true);
  effect();
  await new Promise((resolve) => setTimeout(resolve, 0));
  state.reset();
  const loaded = hook();
  assert.deepEqual(paths, ["", "?after=a"]);
  assert.deepEqual(
    Array.from(loaded.documents, (document) => [
      document.id,
      document.folder_path,
    ]),
    [
      ["a", "Plants"],
      ["b", ""],
    ],
  );
  assert.equal(loaded.loading, false);
  assert.equal(loaded.failed, false);
  loaded.reload();
  state.reset();
  hook();
  assert.equal(state.value(3), 1, "reload requests another load");
});
