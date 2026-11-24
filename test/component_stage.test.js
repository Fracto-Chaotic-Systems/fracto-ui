import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { transformSync } from "esbuild";

test("components keep editor state on back/resume and guard replacing unsaved work", async () => {
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
    create(name) {
      this.history = { present: { name, objects: [], floor: null } };
      this.dirty = true;
    },
    async load() {
      this.history = {
        present: { name: "Saved path", objects: [], floor: null },
      };
      this.dirty = false;
      return true;
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
            state[index] = value;
          },
        ];
      },
      AppText: { get: (key) => key },
      COMPONENT_STAGE_TEXT: {
        new: "new",
        resume: "resume",
        untitled: "untitled",
      },
      KEY_GAMES_COMPOSITES_TITLE: "components",
      styles: { SectionTitle: "h2" },
      GamesInventory: "inventory",
      ComponentStage: "stage",
      SavedComponents: "saved-components",
      useComponentDocument: () => editor,
    },
  );
  const render = () => {
    cursor = 0;
    return module.exports.default();
  };
  const action = (tree, label) =>
    tree.props.toolbar.props.children
      .find((node) => node?.props?.children === label)
      .props.onClick();
  let tree = render();
  assert.equal(tree.type, "inventory");
  assert.equal(tree.props.category, "component");
  action(tree, "new");
  tree = render();
  assert.equal(tree.type, "stage");
  assert.equal(tree.props.editor.history.present.objects.length, 0);
  assert.equal(tree.props.editor.history.present.floor, null);
  editor.history.present.name = "Wooded path";
  tree.props.on_close();
  action(render(), "resume");
  tree = render();
  assert.equal(tree.props.editor.history.present.name, "Wooded path");
  tree.props.on_close();
  action(render(), "new");
  tree = render();
  assert.equal(tree.type, "inventory");
  assert.equal(editor.history.present.name, "Wooded path");
  const notice = tree.props.toolbar.props.children.find(
    (node) => node?.props?.role === "alert",
  );
  assert.ok(notice);
  await notice.props.children
    .find((node) => node?.type === "button")
    .props.onClick();
  tree = render();
  assert.equal(tree.type, "stage");
  assert.equal(editor.history.present.name, "untitled");
});
