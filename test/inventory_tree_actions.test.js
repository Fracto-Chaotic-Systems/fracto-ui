import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { transformSync } from "esbuild";

const delete_hook = readFileSync(
  new URL("../src/pages/games/useInventoryDelete.js", import.meta.url),
  "utf8",
)
  .replace(/^import[^;]+;\r?\n/gm, "")
  .replace("export default function", "function");
const rename_hook = readFileSync(
  new URL("../src/pages/games/useInventoryRename.js", import.meta.url),
  "utf8",
)
  .replace(/^import[^;]+;\r?\n/gm, "")
  .replace("export default function", "function");
const folder_api = readFileSync(
  new URL("../src/pages/games/InventoryFolderApi.js", import.meta.url),
  "utf8",
).replace(/^export /gm, "");
const new_folder_hook = readFileSync(
  new URL("../src/pages/games/useInventoryNewFolder.js", import.meta.url),
  "utf8",
)
  .replace(/^import[^;]+;\r?\n/gm, "")
  .replace("export default function", "function");
// Wrapped so its module-level helpers do not collide with the other inlined sources.
const new_folder_component = `const InventoryNewFolder = (() => {\n${readFileSync(
  new URL("../src/pages/games/InventoryNewFolder.jsx", import.meta.url),
  "utf8",
)
  .replace(/^import[^;]+;\r?\n/gm, "")
  .replace(
    "export default function",
    "function",
  )}\nreturn InventoryNewFolder;\n})();`;
const rename_source = readFileSync(
  new URL("../src/pages/games/InventorySelectionName.jsx", import.meta.url),
  "utf8",
).replace(/^import[^;]+;\r?\n/gm, "");
const compiled = transformSync(
  [
    folder_api,
    delete_hook,
    rename_hook,
    new_folder_hook,
    new_folder_component,
    rename_source,
  ].join("\n"),
  {
    loader: "jsx",
    format: "cjs",
    jsx: "automatic",
    define: { "import.meta.env.BASE_URL": '"/"' },
  },
).code;
const require = createRequire(import.meta.url);
const revision = "a".repeat(64);

// Expand inlined function components so their output can be inspected.
const expand = (element) => {
  if (!element || typeof element !== "object") return element;
  if (typeof element.type === "function")
    return expand(element.type(element.props));
  const children = element.props?.children;
  return {
    ...element,
    props: {
      ...element.props,
      children: Array.isArray(children)
        ? Array.from(children, expand)
        : expand(children),
    },
  };
};

function fixture(target, response_error = null) {
  const states = [];
  let cursor = 0;
  const requests = [];
  const module = { exports: {} };
  const text = new Proxy({}, { get: (_, key) => key });
  runInNewContext(compiled, {
    module,
    exports: module.exports,
    require,
    useRef: () => ({ current: null }),
    useEffect: () => {},
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
    AppText: { get: (key) => key },
    INVENTORY_CATALOG_TEXT: text,
    TreeActions: "div",
    InventoryNameRow: "div",
    CoolEditLink: "pencil",
    CoolIconLink: "icon",
    check_icon: "check-svg",
    cancel_icon: "cancel-svg",
    trash_icon: "trash-svg",
    TreeActionForm: "form",
    AbortSignal,
    fetch: async (url, options = {}) => {
      requests.push({ url, options });
      return {
        ok: !options.method || !response_error,
        json: async () =>
          options.method
            ? response_error
              ? { error: response_error }
              : url.includes("/folders")
                ? { folder_path: JSON.parse(options.body).folder_path }
                : { id: "grass" }
            : { revision, record: { name: "Grass" } },
      };
    },
  });
  let changed = 0;
  const created = [];
  const props = {
    target,
    category: "material",
    folders: ["plants", "plants/herbs"],
    on_changed: async () => changed++,
    on_folder_created: async (path) => created.push(path),
  };
  const render = (extra) => {
    cursor = 0;
    return module.exports.default({ ...props, ...extra });
  };
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
  const find = (tree, type, label) =>
    nodes(expand(tree)).find(
      (node) =>
        (node.type === type ||
          (type === "form" && node.props.as === "form") ||
          (node.type === "icon" &&
            node.props.icon ===
              { trash: "trash-svg", accept: "check-svg", cancel: "cancel-svg" }[
                type
              ])) &&
        (label === undefined || node.props.children === label),
    );
  return { render, find, requests, created, changed: () => changed };
}

const posts = (f) => f.requests.filter((request) => request.options.method);

test("folder details offer New folder, which opens an inline name editor with check and X", async () => {
  const f = fixture({ kind: "folder", path: "plants", label: "plants" });
  const initial = f.render();
  assert.ok(f.find(initial, "button", "new_folder"));
  assert.equal(f.find(initial, "input"), undefined);
  f.find(initial, "button", "new_folder").props.onClick();
  const tree = f.render();
  assert.equal(f.find(tree, "input").props["aria-label"], "new_folder_name");
  assert.equal(f.find(tree, "input").props.maxLength, 64);
  assert.deepEqual(
    Array.from(f.find(tree, "form").props.children, (child) => child.type),
    ["input", "icon", "icon"],
  );
  assert.equal(f.find(tree, "accept").props.color, "#17803d");
  assert.equal(f.find(tree, "accept").props.type, "submit");
  assert.equal(f.find(tree, "cancel").props.color, "#c62828");
  assert.equal(f.find(tree, "strong").props.children, "plants");
  assert.equal(f.find(tree, "pencil").props.disabled, true);
  assert.equal(f.find(tree, "trash").props.disabled, true);
});

test("New folder creates one child of the selected folder through the shared folder request", async () => {
  const f = fixture({ kind: "folder", path: "plants", label: "plants" });
  f.find(f.render(), "button", "new_folder").props.onClick();
  f.find(f.render(), "input").props.onChange({ target: { value: " Ferns " } });
  await f.find(f.render(), "form").props.onSubmit({ preventDefault() {} });
  assert.equal(posts(f).length, 1);
  assert.match(
    posts(f)[0].url,
    /api\/environment-catalog\/folders\?category=material$/,
  );
  assert.deepEqual(JSON.parse(posts(f)[0].options.body), {
    category: "material",
    folder_path: "plants/Ferns",
  });
  assert.deepEqual(f.created, ["plants/Ferns"]);
  assert.equal(f.changed(), 0);
  assert.equal(f.find(f.render(), "form"), undefined);
  assert.ok(f.find(f.render(), "button", "new_folder"));
});

test("New folder rejects nested, non-portable and existing names without a request", async () => {
  for (const value of [
    "a/b",
    "a\\b",
    "what?",
    "C:",
    "trailing.",
    "..",
    "CON",
    "nul.txt",
    "LPT1",
    "x".repeat(65),
    "   ",
  ]) {
    const f = fixture({ kind: "folder", path: "plants", label: "plants" });
    f.find(f.render(), "button", "new_folder").props.onClick();
    f.find(f.render(), "input").props.onChange({ target: { value } });
    await f.find(f.render(), "form").props.onSubmit({ preventDefault() {} });
    assert.equal(posts(f).length, 0, value);
    assert.equal(
      f.find(f.render(), "p", "folder_name_invalid").props.role,
      "alert",
      value,
    );
    assert.equal(f.find(f.render(), "input").props.value, value);
  }
  const f = fixture({ kind: "folder", path: "plants", label: "plants" });
  f.find(f.render(), "button", "new_folder").props.onClick();
  f.find(f.render(), "input").props.onChange({ target: { value: "herbs" } });
  await f.find(f.render(), "form").props.onSubmit({ preventDefault() {} });
  assert.equal(posts(f).length, 0);
  assert.ok(f.find(f.render(), "p", "folder_exists"));
});

test("New folder cancel and Escape send nothing; server errors keep the draft", async () => {
  const f = fixture({ kind: "folder", path: "plants", label: "plants" });
  f.find(f.render(), "button", "new_folder").props.onClick();
  f.find(f.render(), "cancel").props.on_click();
  assert.equal(f.find(f.render(), "form"), undefined);
  f.find(f.render(), "button", "new_folder").props.onClick();
  let prevented = false;
  f.find(f.render(), "input").props.onKeyDown({
    key: "Escape",
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.equal(f.find(f.render(), "form"), undefined);
  assert.equal(posts(f).length, 0);

  const failing = fixture(
    { kind: "folder", path: "plants", label: "plants" },
    "invalid_folder",
  );
  failing.find(failing.render(), "button", "new_folder").props.onClick();
  failing
    .find(failing.render(), "input")
    .props.onChange({ target: { value: "Ferns" } });
  await failing
    .find(failing.render(), "form")
    .props.onSubmit({ preventDefault() {} });
  assert.equal(failing.find(failing.render(), "input").props.value, "Ferns");
  assert.ok(failing.find(failing.render(), "p", "invalid_folder"));
  assert.deepEqual(failing.created, []);
});

test("New folder is disabled while renaming, deleting or a catalog draft is open, and absent for models", async () => {
  const f = fixture({ kind: "folder", path: "plants", label: "plants" });
  assert.equal(
    f.find(f.render({ disabled: true }), "button", "new_folder").props.disabled,
    true,
  );
  f.find(f.render({ disabled: true }), "button", "new_folder").props.onClick();
  assert.equal(f.find(f.render(), "form"), undefined);
  await f.find(f.render(), "trash").props.on_click();
  assert.equal(f.find(f.render(), "button", "new_folder").props.disabled, true);
  const model = fixture({ kind: "model", id: "grass", label: "Grass" });
  assert.equal(model.find(model.render(), "button", "new_folder"), undefined);
});

test("model deletion waits for confirmation and Cancel never sends a mutation", async () => {
  const f = fixture({ kind: "model", id: "grass", label: "Grass" });
  await f.find(f.render(), "trash").props.on_click();
  let tree = f.render();
  assert.ok(f.find(tree, "form"));
  assert.equal(
    f.requests.filter((request) => request.options.method).length,
    0,
  );
  f.find(tree, "button", "cancel").props.onClick();
  assert.equal(f.find(f.render(), "form"), undefined);
  await f.find(f.render(), "trash").props.on_click();
  tree = f.render();
  await f.find(tree, "form").props.onSubmit({ preventDefault() {} });
  const request = f.requests.find((request) => request.options.method);
  assert.deepEqual(JSON.parse(request.options.body), {
    action: "delete-model",
    id: "grass",
    revision,
  });
  assert.equal(f.changed(), 1);
});

test("folder rename submits a category-scoped name and refreshes after success", async () => {
  const f = fixture({
    kind: "folder",
    path: "plants/herbs",
    label: "plants/herbs",
  });
  await f.find(f.render(), "pencil").props.on_click();
  f.find(f.render(), "input").props.onChange({ target: { value: "flowers" } });
  await f.find(f.render(), "form").props.onSubmit({ preventDefault() {} });
  assert.deepEqual(JSON.parse(f.requests[0].options.body), {
    action: "rename-folder",
    category: "material",
    folder_path: "plants/herbs",
    name: "flowers",
  });
  assert.equal(f.changed(), 1);
});

test("open catalog drafts disable tree confirmation, and conflict feedback keeps the form", async () => {
  const f = fixture(
    { kind: "folder", path: "plants", label: "plants" },
    "folder_not_empty",
  );
  await f.find(f.render(), "trash").props.on_click();
  const blocked = f.render({ disabled: true });
  assert.equal(
    f.find(blocked, "button", "confirm_delete").props.disabled,
    true,
  );
  await f.find(blocked, "form").props.onSubmit({ preventDefault() {} });
  assert.equal(f.requests.length, 0);
  await f.find(f.render(), "form").props.onSubmit({ preventDefault() {} });
  assert.equal(f.changed(), 0);
  assert.ok(f.find(f.render(), "form"));
  assert.equal(f.find(f.render(), "p", "folder_not_empty").props.role, "alert");
});

test("model pencil opens rename controls in the details panel and preserves revision checks", async () => {
  const f = fixture({ kind: "model", id: "grass", label: "Grass" });
  assert.equal(f.find(f.render(), "pencil").props.title, "rename");
  await f.find(f.render(), "pencil").props.on_click();
  assert.equal(f.find(f.render(), "input").props.value, "Grass");
  f.find(f.render(), "input").props.onChange({
    target: { value: "Meadow grass" },
  });
  await f.find(f.render(), "form").props.onSubmit({ preventDefault() {} });
  const post = f.requests.find((request) => request.options.method);
  assert.deepEqual(JSON.parse(post.options.body), {
    action: "rename-model",
    id: "grass",
    revision,
    name: "Meadow grass",
  });
  assert.equal(f.changed(), 1);
  assert.equal(f.find(f.render(), "form"), undefined);
});
test("rename cancellation and catalog draft protection send no mutations; tree exposes no rename action", async () => {
  const f = fixture({ kind: "folder", path: "plants", label: "plants" });
  await f.find(f.render({ disabled: true }), "pencil").props.on_click();
  assert.equal(f.find(f.render(), "form"), undefined);
  await f.find(f.render(), "pencil").props.on_click();
  const blocked = f.render({ disabled: true });
  await f.find(blocked, "form").props.onSubmit({ preventDefault() {} });
  assert.equal(f.requests.length, 0);
  f.find(f.render(), "cancel").props.on_click();
  assert.equal(f.find(f.render(), "form"), undefined);
  const tree = fixture({ kind: "model", id: "grass", label: "Grass" });
  assert.equal(tree.find(tree.render(), "button", "rename"), undefined);
});
test("a rename conflict retains the details-panel draft and reports the error", async () => {
  const f = fixture(
    { kind: "model", id: "grass", label: "Grass" },
    "file_conflict",
  );
  await f.find(f.render(), "pencil").props.on_click();
  f.find(f.render(), "input").props.onChange({
    target: { value: "Draft name" },
  });
  await f.find(f.render(), "form").props.onSubmit({ preventDefault() {} });
  assert.equal(f.find(f.render(), "input").props.value, "Draft name");
  assert.equal(f.find(f.render(), "p", "file_conflict").props.role, "alert");
  assert.equal(f.changed(), 0);
});

test("details header includes a dark red hover trash action and verifies deletion inline", async () => {
  const f = fixture({ kind: "folder", path: "plants", label: "plants" });
  const initial = f.render();
  const row = f.find(initial, "div");
  assert.deepEqual(
    Array.from(row.props.children)
      .slice(1)
      .map((child) =>
        child.props.icon === "trash-svg" ? "trash" : child.type,
      ),
    ["pencil", "trash"],
  );
  assert.equal(f.find(initial, "trash").props.title, "delete");
  assert.equal(f.find(initial, "trash").props.color, "#8b1e1e");
  assert.equal(
    f.find(initial, "trash").props.className,
    "inventory-delete-action",
  );
  assert.equal(f.find(initial, "button", "delete"), undefined);
  assert.equal(f.find(initial, "form"), undefined);
  await f.find(initial, "trash").props.on_click();
  assert.equal(f.requests.length, 0);
  assert.ok(f.find(f.render(), "button", "confirm_delete"));
  assert.equal(f.find(f.render(), "pencil").props.disabled, true);
  await f.find(f.render(), "pencil").props.on_click();
  assert.equal(f.requests.length, 0);
  await f.find(f.render(), "form").props.onSubmit({ preventDefault() {} });
  assert.deepEqual(JSON.parse(f.requests[0].options.body), {
    action: "delete-folder",
    category: "material",
    folder_path: "plants",
  });
  assert.equal(f.changed(), 1);
});
test("rename and delete cannot overlap in the details panel", async () => {
  const f = fixture({ kind: "folder", path: "plants", label: "plants" });
  await f.find(f.render(), "pencil").props.on_click();
  assert.equal(f.find(f.render(), "trash"), undefined);
  assert.equal(f.find(f.render(), "pencil"), undefined);
  assert.equal(f.find(f.render(), "button", "confirm_delete"), undefined);
  assert.equal(f.requests.length, 0);
});

test("rename replaces the header name in place with green accept and red cancel on its right", async () => {
  const f = fixture({ kind: "folder", path: "plants", label: "plants" });
  await f.find(f.render(), "pencil").props.on_click();
  const tree = f.render(),
    row = f.find(tree, "form");
  assert.equal(row.props.as, "form");
  assert.deepEqual(
    Array.from(row.props.children, (child) => child.type),
    ["input", "icon", "icon"],
  );
  assert.equal(f.find(tree, "accept").props.color, "#17803d");
  assert.equal(f.find(tree, "accept").props.type, "submit");
  assert.equal(f.find(tree, "cancel").props.color, "#c62828");
  assert.equal(f.find(tree, "input").props.value, "plants");
  assert.equal(f.find(tree, "input").props["aria-label"], "new_name");
  assert.equal(f.find(tree, "pencil"), undefined);
  assert.equal(f.find(tree, "trash"), undefined);
  assert.equal(f.find(tree, "strong"), undefined);
  f.find(tree, "input").props.onChange({ target: { value: "Discarded name" } });
  f.find(f.render(), "cancel").props.on_click();
  assert.equal(f.find(f.render(), "strong").props.children, "plants");
  assert.ok(f.find(f.render(), "pencil"));
  assert.ok(f.find(f.render(), "trash"));
  assert.equal(f.requests.length, 0);
});
test("Escape cancels inline renaming without a mutation", async () => {
  const f = fixture({ kind: "model", id: "grass", label: "Grass" });
  await f.find(f.render(), "pencil").props.on_click();
  let prevented = false;
  f.find(f.render(), "input").props.onKeyDown({
    key: "Escape",
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.equal(f.find(f.render(), "input"), undefined);
  assert.equal(
    f.requests.filter((request) => request.options.method).length,
    0,
  );
});

const folders_hook = readFileSync(
  new URL("../src/pages/games/useInventoryFolders.js", import.meta.url),
  "utf8",
)
  .replace(/^import[^;]+;\r?\n/gm, "")
  .replace("export default function", "function");
const tree_source = readFileSync(
  new URL("../src/pages/games/InventoryAssetTree.jsx", import.meta.url),
  "utf8",
).replace(/^import[^;]+;\r?\n/gm, "");
const tree_compiled = transformSync(
  [
    folder_api,
    new_folder_hook,
    new_folder_component,
    folders_hook,
    tree_source,
  ].join("\n"),
  {
    loader: "jsx",
    format: "cjs",
    jsx: "automatic",
    define: { "import.meta.env.BASE_URL": '"/"' },
  },
).code;

function tree_fixture() {
  const states = [];
  let cursor = 0;
  const requests = [];
  const module = { exports: {} };
  const text = new Proxy({}, { get: (_, key) => key });
  runInNewContext(tree_compiled, {
    module,
    exports: module.exports,
    require,
    useRef: () => ({ current: null }),
    useEffect: () => {},
    useMemo: (compute) => compute(),
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
    AppText: { get: (key) => key },
    INVENTORY_CATALOG_TEXT: text,
    INVENTORY_TEXT: text,
    build_inventory_asset_tree: () => ({ nodes: [], folder_keys: [] }),
    CoolTree: "tree",
    InventoryTreeHost: "div",
    TreeActions: "div",
    InventoryNameRow: "div",
    CoolIconLink: "icon",
    check_icon: "check-svg",
    cancel_icon: "cancel-svg",
    AbortSignal,
    fetch: async (url, options = {}) => {
      requests.push({ url, options });
      return {
        ok: true,
        json: async () => ({
          folder_path: JSON.parse(options.body).folder_path,
        }),
      };
    },
  });
  const render = (extra) => {
    cursor = 0;
    return module.exports.default({
      assets: [],
      selected: null,
      on_select() {},
      category: "material",
      selected_folder: null,
      on_folder_select() {},
      ...extra,
    });
  };
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
  const find = (tree, type, label) =>
    nodes(expand(tree)).find(
      (node) =>
        (node.type === type ||
          (type === "form" && node.props?.as === "form")) &&
        (label === undefined || node.props.children === label),
    );
  return { render, find, requests };
}

test("tree New folder uses the inline name row, creates root-level folders and has no path help", async () => {
  const f = tree_fixture();
  const initial = f.render();
  assert.ok(f.find(initial, "button", "new_folder"));
  assert.equal(f.find(initial, "small"), undefined);
  assert.equal(f.find(initial, "label"), undefined);
  f.find(initial, "button", "new_folder").props.onClick();
  const editing = f.render();
  assert.equal(f.find(editing, "small"), undefined);
  assert.equal(f.find(editing, "input").props["aria-label"], "new_folder_name");
  assert.deepEqual(
    Array.from(f.find(editing, "form").props.children, (child) => child.type),
    ["input", "icon", "icon"],
  );
  f.find(editing, "input").props.onChange({
    target: { value: "Plants/Herbs" },
  });
  await f.find(f.render(), "form").props.onSubmit({ preventDefault() {} });
  assert.equal(f.requests.length, 0);
  assert.ok(f.find(f.render(), "p", "folder_name_invalid"));
  f.find(f.render(), "input").props.onChange({ target: { value: "Plants" } });
  await f.find(f.render(), "form").props.onSubmit({ preventDefault() {} });
  assert.deepEqual(JSON.parse(f.requests[0].options.body), {
    category: "material",
    folder_path: "Plants",
  });
  assert.equal(f.find(f.render(), "form"), undefined);
});

test("choosing a component document leaf opens it instead of selecting a folder", () => {
  const f = tree_fixture();
  const opened = [],
    folders = [];
  const tree = f.render({
    documents: [{ id: "doc-1", name: "Grass strip", folder_path: "" }],
    on_document_open: (id) => opened.push(id),
    on_folder_select: (folder) => folders.push(folder),
  });
  f.find(tree, "tree").props.on_select(["document:doc-1"], {
    items: [{ isLeaf: true, metadata: { document_id: "doc-1" } }],
  });
  assert.deepEqual(opened, ["doc-1"]);
  // Opening a component clears any folder selection so the stage can show.
  assert.deepEqual(folders, [null]);
  folders.length = 0;
  f.find(tree, "tree").props.on_select(["folder:Plants"], {
    items: [{ isLeaf: false }],
  });
  assert.deepEqual(folders, ["Plants"]);
});
