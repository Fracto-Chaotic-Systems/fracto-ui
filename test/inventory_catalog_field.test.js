import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { transformSync } from "esbuild";

const require = createRequire(import.meta.url);
const compile = (file, transform = (source) => source) =>
  transformSync(
    transform(
      readFileSync(
        new URL(`../src/pages/games/${file}`, import.meta.url),
        "utf8",
      ).replace(/^import[^;]+;\r?\n/gm, ""),
    ),
    {
      loader: "jsx",
      format: "cjs",
      jsx: "automatic",
      define: { "import.meta.env.BASE_URL": '"/"' },
    },
  ).code;
function hooks() {
  const state = [];
  let cursor = 0;
  return {
    reset: () => (cursor = 0),
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [
        state[index],
        (value) => {
          state[index] =
            typeof value === "function" ? value(state[index]) : value;
        },
      ];
    },
  };
}
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
const find = (tree, predicate) => nodes(tree).find(predicate);

function field_fixture() {
  const h = hooks();
  const module = { exports: {} };
  runInNewContext(
    compile("InventoryCatalogField.jsx", (source) =>
      source
        .replace("export const MULTILINE_FIELDS", "const MULTILINE_FIELDS")
        .replace(
          "export default function",
          "module.exports.default = function",
        ),
    ),
    {
      module,
      require,
      useState: h.useState,
      useRef: () => ({ current: null }),
      useEffect: () => {},
      AppText: { get: (key) => key },
      INVENTORY_CATALOG_TEXT: new Proxy({}, { get: (_, key) => key }),
      CoolIconLink: "icon",
      CoolEditLink: "pencil",
      check_icon: "check",
      cancel_icon: "x",
      CatalogValue: "value",
      CatalogFieldForm: "form",
    },
  );
  const calls = [];
  const render = (props) => {
    h.reset();
    return module.exports.default({
      field: "creator_name",
      value: "Ada",
      editing: false,
      on_begin: (field) => calls.push(["begin", field]),
      on_cancel: () => calls.push(["cancel"]),
      on_save: async (field, value) => calls.push(["save", field, value]),
      ...props,
    });
  };
  return { render, calls };
}

test("an attribution value is clicked (or its pencil) to edit in place", () => {
  const f = field_fixture();
  const view = f.render();
  const value = find(view, (node) => node.type === "button");
  assert.equal(value.props.children, "Ada");
  assert.equal(
    find(view, (node) => node.type === "pencil").props.className,
    "catalog-edit-action",
  );
  value.props.onClick();
  find(view, (node) => node.type === "pencil").props.on_click();
  assert.deepEqual(f.calls, [
    ["begin", "creator_name"],
    ["begin", "creator_name"],
  ]);
  const empty = f.render({ value: "" });
  assert.equal(
    find(empty, (node) => node.type === "button").props.children,
    "missing",
  );
  const blocked = f.render({ disabled: true });
  find(blocked, (node) => node.type === "button").props.onClick();
  assert.equal(f.calls.length, 2);
  // Links stay links; the pencil edits them.
  const link = f.render({
    field: "source_url",
    value: "https://example.com/x",
    url: "https://example.com/x",
  });
  assert.equal(
    find(link, (node) => node.type === "a").props.href,
    "https://example.com/x",
  );
  assert.equal(
    find(link, (node) => node.type === "button"),
    undefined,
  );
});

test("editing shows the input with the green check and red X; Escape and X cancel", async () => {
  const f = field_fixture();
  f.render();
  let form = f.render({ editing: true });
  assert.deepEqual(
    Array.from(form.props.children, (child) => child.type),
    ["input", "icon", "icon"],
  );
  const [input, check, cancel] = Array.from(form.props.children);
  assert.equal(input.props.value, "Ada");
  assert.equal(input.props.type, "text");
  assert.equal(input.props["aria-label"], "creator_name");
  assert.equal(check.props.color, "#17803d");
  assert.equal(check.props.type, "submit");
  assert.equal(cancel.props.color, "#c62828");
  // Unchanged text cancels instead of saving.
  await form.props.onSubmit({ preventDefault() {} });
  assert.deepEqual(f.calls.at(-1), ["cancel"]);
  input.props.onChange({ target: { value: "Ada Lovelace" } });
  form = f.render({ editing: true });
  await form.props.onSubmit({ preventDefault() {} });
  assert.deepEqual(f.calls.at(-1), ["save", "creator_name", "Ada Lovelace"]);
  let prevented = false;
  Array.from(form.props.children)[0].props.onKeyDown({
    key: "Escape",
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.deepEqual(f.calls.at(-1), ["cancel"]);
  Array.from(form.props.children)[2].props.on_click();
  assert.deepEqual(f.calls.at(-1), ["cancel"]);
  const notes = f.render({ field: "notes", editing: true });
  assert.equal(Array.from(notes.props.children)[0].type, "textarea");
  const url = f.render({ field: "source_url", editing: true });
  assert.equal(Array.from(url.props.children)[0].props.type, "url");
});

function panel_fixture() {
  const h = hooks();
  const saved = [];
  const catalog = {
    record: {
      id: "grass",
      name: "Grass",
      description: "Meadow grass",
      version: "1.0",
      folder_path: "plants",
      attribution: { creator_name: "Ada", source_url: "https://example.com/x" },
      sources: [],
      history: [],
    },
    editing: false,
    busy: false,
    reload() {},
    async save_field(key, value) {
      saved.push([key, value]);
      return true;
    },
  };
  const module = { exports: {} };
  runInNewContext(
    compile("InventoryCatalogPanel.jsx", (s) =>
      s.replace("export default function", "module.exports.default = function"),
    ),
    {
      module,
      require,
      Fragment: "fragment",
      useState: h.useState,
      useEffect: () => {},
      AppText: { get: (key) => key },
      INVENTORY_CATALOG_TEXT: new Proxy({}, { get: (_, key) => key }),
      ATTRIBUTION_FIELDS: ["creator_name", "source_url"],
      safe_catalog_url: (value) => value || null,
      useInventoryCatalog: () => catalog,
      InventoryCatalogEditor: "editor",
      InventoryCatalogField: "field",
      CoolTabs: "tabs",
      CatalogPanel: "section",
      CatalogTab: "tab",
      CatalogMessage: "p",
    },
  );
  const render = (props) => {
    h.reset();
    return module.exports.default({ asset_id: "grass", ...props });
  };
  const fields = (tree) => nodes(tree).filter((node) => node.type === "field");
  return { render, fields, saved, catalog };
}

test("only attribution values are editable, one at a time", async () => {
  const f = panel_fixture();
  let tree = f.render();
  const fields = f.fields(tree);
  assert.deepEqual(
    fields.map((field) => field.props.field),
    ["creator_name", "source_url"],
  );
  // Only the version is shown as plain text; ID and folder are in the right panel.
  const dl = find(tree, (node) => node.type === "dl");
  const plain = Array.from(dl.props.children).slice(0, 2);
  assert.deepEqual(
    plain.map((node) => node.props.children),
    ["version", "1.0"],
  );
  assert.equal(
    nodes(dl).some(
      (node) =>
        node.props?.children === "grass" || node.props?.children === "plants",
    ),
    false,
  );
  // The description is shown on the metadata tab, not in details.
  assert.equal(
    find(
      tree,
      (node) => node.type === "p" && node.props.children === "Meadow grass",
    ),
    undefined,
  );
  assert.equal(fields[1].props.url, "https://example.com/x");
  fields[0].props.on_begin("creator_name");
  tree = f.render();
  const [open, other] = f.fields(tree);
  assert.equal(open.props.editing, true);
  assert.equal(other.props.disabled, true, "only one value edits at a time");
  await open.props.on_save("creator_name", "Ada Lovelace");
  assert.deepEqual(f.saved, [["creator_name", "Ada Lovelace"]]);
  assert.equal(f.fields(f.render())[0].props.editing, false);
  assert.equal(
    f.fields(f.render({ editing_disabled: true }))[0].props.disabled,
    true,
  );
  f.catalog.editing = true;
  assert.equal(f.fields(f.render())[0].props.disabled, true);
});

test("saving one attribution value keeps the rest of the record", async () => {
  const h = hooks();
  const requests = [];
  const module = { exports: {} };
  const effects = [];
  runInNewContext(
    compile("useInventoryCatalog.js", (s) =>
      s.replace("export default function", "module.exports.default = function"),
    ),
    {
      module,
      require,
      useState: h.useState,
      useEffect: (effect) => effects.push(effect),
      ATTRIBUTION_FIELDS: ["creator_name", "source_url", "notes"],
      CATALOG_DRAFT_PREFIX: "draft/",
      read_catalog_draft: () => {
        throw new Error("none");
      },
      window: { localStorage: {} },
      AbortController,
      fetch: async (url, options = {}) => {
        requests.push({ url, options });
        const record = {
          name: "Grass",
          folder_path: "plants",
          attribution: {
            creator_name: "Ada",
            source_url: "https://a.example",
            notes: "",
          },
          history: [],
        };
        return {
          ok: true,
          json: async () => ({ revision: "r1", record }),
        };
      },
    },
  );
  const saved = [];
  h.reset();
  module.exports.default("grass", async (record) => saved.push(record));
  effects[0]();
  await new Promise((resolve) => setTimeout(resolve, 0));
  h.reset();
  const catalog = module.exports.default("grass", async (record) =>
    saved.push(record),
  );
  assert.equal(await catalog.save_field("creator_name", "Ada Lovelace"), true);
  const patch = requests.find((request) => request.options.method === "PATCH");
  assert.match(patch.url, /api\/environment-catalog\/grass$/);
  assert.deepEqual(JSON.parse(patch.options.body), {
    revision: "r1",
    attribution: {
      creator_name: "Ada Lovelace",
      source_url: "https://a.example",
      notes: "",
    },
    note: "",
    folder_path: "plants",
  });
  assert.equal(saved.length, 1);
  h.reset();
  const again = module.exports.default("grass", () => {});
  assert.equal(
    await again.save_field("name", "Renamed"),
    false,
    "non-attribution keys are refused",
  );
  assert.equal(
    requests.filter((request) => request.options.method === "PATCH").length,
    1,
  );
});
