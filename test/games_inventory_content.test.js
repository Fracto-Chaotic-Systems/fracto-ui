import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { transformSync } from "esbuild";

function fixture(assets = []) {
  const source = readFileSync(
    new URL("../src/pages/games/GamesInventory.jsx", import.meta.url),
    "utf8",
  ).replace(/^import[^;]+;\r?\n/gm, "");
  const module = { exports: {} };
  const state = [];
  let cursor = 0;
  const text = new Proxy({}, { get: (_, key) => key });
  const styled = Object.fromEntries(
    [
      "InventoryLayout",
      "InventoryToolbar",
      "InventoryWorkspace",
      "InventoryViewport",
      "InventoryStatus",
      "InventoryControls",
      "InventoryCaption",
      "InventoryPreviewPane",
      "InventoryDetails",
      "InventoryAssetList",
      "InventoryContent",
    ].map((name) => [name, name]),
  );
  runInNewContext(
    transformSync(source, { loader: "jsx", format: "cjs", jsx: "automatic" })
      .code,
    {
      module,
      exports: module.exports,
      require: createRequire(import.meta.url),
      useRef: () => ({ current: null }),
      useEffect: () => {},
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
      AppText: { get: (key) => key },
      INVENTORY_TEXT: text,
      INVENTORY_CATALOG_TEXT: text,
      create_inventory_scene: () => ({}),
      DEFAULT_INVENTORY_PREVIEW: {},
      InventoryCatalogPanel: "catalog",
      MaterialMetadataPanel: "metadata",
      InventoryImport: "import",
      InventoryAssetTree: "tree",
      InventorySelectionName: "selection-name",
      useInventoryAssets: () => ({
        assets,
        selected: assets[0]?.id ?? null,
        asset: assets[0] ?? null,
        loading: false,
        error: false,
        select() {},
        reload: async () => {},
      }),
      ...styled,
    },
  );
  const render = (props) => {
    cursor = 0;
    return module.exports.default({ category: "component", ...props });
  };
  const nodes = (element) => {
    if (!element || typeof element !== "object") return [];
    const children = element.props?.children;
    return [
      element,
      ...(Array.isArray(children) ? Array.from(children) : [children]).flatMap(
        (child) => (Array.isArray(child) ? child.flatMap(nodes) : nodes(child)),
      ),
    ];
  };
  const find = (tree, type) => nodes(tree).find((node) => node.type === type);
  return { render, find };
}

test("content fills the area right of the tree instead of the preview and details", () => {
  const f = fixture([{ id: "grass", name: "Grass", folder_path: "" }]);
  const tree = f.render({ content: "the-stage", selected_document: "doc-1" });
  const workspace = f.find(tree, "InventoryWorkspace");
  const content = f.find(workspace, "InventoryContent");
  assert.equal(content.props.children, "the-stage");
  assert.equal(f.find(workspace, "InventoryPreviewPane"), undefined);
  assert.equal(f.find(workspace, "InventoryControls"), undefined);
  const list = f.find(tree, "tree");
  assert.equal(list.props.selected_document, "doc-1");
  assert.equal(
    list.props.selected,
    null,
    "the open component is highlighted, not an asset",
  );

  const plain = f.render();
  assert.equal(f.find(plain, "InventoryContent"), undefined);
  assert.ok(f.find(plain, "InventoryPreviewPane"));
  assert.equal(f.find(plain, "tree").props.selected, "grass");
  assert.equal(f.find(plain, "tree").props.selected_document, null);
});

test("a page can own folder selection; the details panel follows it", () => {
  const f = fixture();
  const chosen = [];
  const tree = f.render({
    selected_folder: "Plants",
    on_folder_select: (path) => chosen.push(path),
  });
  assert.equal(f.find(tree, "tree").props.selected_folder, "Plants");
  const name = f.find(tree, "selection-name");
  assert.deepEqual({ ...name.props.target }, {
    kind: "folder",
    path: "Plants",
    label: "Plants",
  });
  f.find(tree, "tree").props.on_folder_select("Other");
  assert.deepEqual(chosen, ["Other"]);
});
