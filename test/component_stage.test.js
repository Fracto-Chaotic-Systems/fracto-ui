import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { transformSync } from "esbuild";

function fixture() {
  const source = readFileSync(
    new URL("../src/pages/games/GamesComposites.jsx", import.meta.url),
    "utf8",
  ).replace(/^import[^;]+;\r?\n/gm, "");
  const module = { exports: {} };
  const state = [];
  let cursor = 0;
  const editor = {
    history: null,
    busy: false,
    dirty: false,
    message: null,
    revision: 0,
    loaded: [],
    saves: 0,
    create(name) {
      this.history = {
        present: { id: "new-1", name, objects: [], floor: null },
      };
      this.revision = 0;
      this.dirty = true;
    },
    async load(id) {
      this.loaded.push(id);
      this.history = {
        present: { id, name: "Saved path", objects: [], floor: null },
      };
      this.dirty = false;
      this.revision = 3;
      return true;
    },
    async save() {
      this.saves++;
      this.dirty = false;
      return true;
    },
  };
  const saved = {
    documents: [
      { id: "doc-1", name: "Grass strip", revision: 3, folder_path: "Plants" },
      { id: "doc-2", name: "Path", revision: 1, folder_path: "" },
    ],
    loading: false,
    failed: false,
    reloads: 0,
    reload() {
      saved.reloads++;
    },
  };
  runInNewContext(
    transformSync(source, { loader: "jsx", format: "cjs", jsx: "automatic" })
      .code,
    {
      module,
      exports: module.exports,
      require: createRequire(import.meta.url),
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
      COMPONENT_STAGE_TEXT: new Proxy({}, { get: (_, key) => key }),
      KEY_GAMES_COMPOSITES_TITLE: "components",
      styles: { SectionTitle: "h2" },
      GamesInventory: "inventory",
      ComponentStage: "stage",
      ComponentFolderMove: "folder-move",
      useComponentDocument: () => editor,
      useComponentDocuments: () => saved,
    },
  );
  const render = () => {
    cursor = 0;
    return module.exports.default();
  };
  const toolbar = (tree) =>
    Array.from(tree.props.toolbar.props.children).filter(Boolean);
  const button = (tree, label) =>
    toolbar(tree).find((node) => node?.props?.children === label);
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  return { editor, saved, render, toolbar, button, tick };
}

test("the components page always shows the tree; the stage fills the area to its right", async () => {
  const f = fixture();
  let page = f.render();
  assert.equal(page.type, "inventory");
  assert.equal(page.props.category, "component");
  assert.equal(page.props.documents, f.saved.documents);
  assert.equal(page.props.content, null);
  f.button(page, "new").props.onClick();
  await f.tick();
  page = f.render();
  assert.equal(page.type, "inventory");
  assert.equal(page.props.content.type, "stage");
  assert.equal(page.props.selected_document, "new-1");
  assert.equal("on_close" in page.props.content.props, false);
  // Unsaved components have no folder until their first save.
  assert.equal(page.props.content.props.folder_control, false);
  assert.equal(f.button(page, "resume"), undefined);
});

test("selecting a component loads it into the stage; re-selecting it keeps edits", async () => {
  const f = fixture();
  f.render().props.on_document_open("doc-1");
  await f.tick();
  let page = f.render();
  assert.deepEqual(f.editor.loaded, ["doc-1"]);
  assert.equal(page.props.content.type, "stage");
  assert.equal(page.props.selected_document, "doc-1");
  const move = page.props.content.props.folder_control;
  assert.equal(move.type, "folder-move");
  assert.equal(move.props.folder_path, "Plants");
  assert.equal(move.props.on_moved, f.saved.reload);
  // A folder selection shows the folder details; the edited draft stays loaded.
  f.editor.dirty = true;
  page.props.on_folder_select("Plants");
  page = f.render();
  assert.equal(page.props.selected_folder, "Plants");
  assert.equal(page.props.content, null);
  assert.ok(f.button(page, "resume"));
  page.props.on_document_open("doc-1");
  page = f.render();
  assert.equal(page.props.content.type, "stage");
  assert.equal(page.props.selected_folder, null);
  assert.deepEqual(
    f.editor.loaded,
    ["doc-1"],
    "no reload of the open component",
  );
  // Another component asks before discarding the unsaved draft.
  page.props.on_document_open("doc-2");
  page = f.render();
  const notice = f.toolbar(page).find((node) => node?.props?.role === "alert");
  assert.ok(notice);
  assert.deepEqual(f.editor.loaded, ["doc-1"]);
  await Array.from(notice.props.children)
    .find((node) => node?.type === "button")
    .props.onClick();
  page = f.render();
  assert.deepEqual(f.editor.loaded, ["doc-1", "doc-2"]);
  assert.equal(page.props.selected_document, "doc-2");
});

test("saving from the stage refreshes the tree; choosing a published asset hides the stage", async () => {
  const f = fixture();
  f.render().props.on_document_open("doc-2");
  await f.tick();
  let page = f.render();
  const before = f.saved.reloads;
  assert.equal(await page.props.content.props.editor.save(), true);
  assert.equal(f.editor.saves, 1);
  assert.equal(f.saved.reloads, before + 1);
  page.props.on_asset_select("grass");
  page = f.render();
  assert.equal(page.props.content, null);
  // Clearing the folder selection (as opening a component does) never hides the stage.
  page.props.on_document_open("doc-2");
  page = f.render();
  page.props.on_folder_select(null);
  assert.equal(f.render().props.content.type, "stage");
});
