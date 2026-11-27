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
    .replace(/^export const /gm, "const ")
    .replace("export default function", "module.exports.default = function");
  const module = { exports: {} };
  runInNewContext(
    transformSync(source, { loader: "jsx", format: "cjs", jsx: "automatic" })
      .code,
    { module, require, ...globals },
  );
  return module.exports.default;
};
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
const kids = (node) => Array.from([node?.props?.children].flat());

function name_fixture() {
  const h = hooks();
  const component = load("ComponentNameEdit.jsx", {
    useState: h.useState,
    useRef: () => ({ current: null }),
    useEffect: () => {},
    AppText: { get: (key) => key },
    INVENTORY_CATALOG_TEXT: new Proxy({}, { get: (_, key) => key }),
    CoolIconLink: "icon",
    CoolEditLink: "pencil",
    check_icon: "check",
    cancel_icon: "x",
    InventoryNameRow: "row",
  });
  const renames = [];
  const render = (props) => {
    h.reset();
    return component({
      name: "Grass strip",
      on_rename: (name) => renames.push(name),
      ...props,
    });
  };
  return { render, renames };
}

test("the component name shows with the pencil and edits in place", async () => {
  const f = name_fixture();
  const row = f.render();
  assert.equal(row.type, "row");
  const [name, pencil] = kids(row);
  assert.equal(name.type, "strong");
  assert.equal(name.props.children, "Grass strip");
  assert.equal(pencil.props.title, "rename");
  pencil.props.on_click();
  const editing = f.render();
  const form = kids(editing)[0];
  assert.equal(form.props.as, "form");
  const [input, check, cancel] = kids(form);
  assert.deepEqual(
    [input.type, check.type, cancel.type],
    ["input", "icon", "icon"],
  );
  assert.equal(input.props.value, "Grass strip");
  assert.equal(input.props.maxLength, 120);
  assert.equal(check.props.color, "#17803d");
  assert.equal(check.props.type, "submit");
  assert.equal(cancel.props.color, "#c62828");
  input.props.onChange({ target: { value: "  Meadow strip " } });
  await kids(f.render())[0].props.onSubmit({ preventDefault() {} });
  assert.deepEqual(f.renames, ["Meadow strip"]);
  assert.equal(f.render().type, "row");
});

test("unchanged, blank or cancelled names change nothing", () => {
  const f = name_fixture();
  kids(f.render())[1].props.on_click();
  kids(f.render())[0].props.onSubmit({ preventDefault() {} });
  assert.deepEqual(f.renames, []);
  assert.equal(f.render().type, "row");
  kids(f.render())[1].props.on_click();
  kids(kids(f.render())[0])[0].props.onChange({ target: { value: "   " } });
  kids(f.render())[0].props.onSubmit({ preventDefault() {} });
  assert.deepEqual(f.renames, []);
  const invalid = kids(f.render())[1];
  assert.equal(invalid.props.role, "alert");
  assert.equal(invalid.props.children, "rename_invalid");
  let prevented = false;
  kids(kids(f.render())[0])[0].props.onKeyDown({
    key: "Escape",
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.equal(f.render().type, "row");
  const blocked = f.render({ disabled: true });
  assert.equal(kids(blocked)[1].props.disabled, true);
  kids(blocked)[1].props.on_click();
  assert.equal(f.render({ disabled: true }).type, "row");
});

test("the stage's right panel holds the name, folder, lighting and variants", () => {
  const h = hooks();
  let cursor_ref = 0;
  const refs = [];
  const stage = load("ComponentStage.jsx", {
    useState: h.useState,
    useRef: (initial) => (refs[cursor_ref++] ??= { current: initial }),
    useMemo: (compute) => compute(),
    useEffect: () => {},
    create_component_stage: () => ({}),
    preview_component_variant: () => ({}),
    AppText: { get: (key) => key },
    COMPONENT_STAGE_TEXT: new Proxy({}, { get: (_, key) => key }),
    INVENTORY_TEXT: new Proxy({}, { get: (_, key) => key }),
    StageHost: "host",
    InventoryToolbar: "toolbar",
    InventoryCaption: "caption",
    InventoryStatus: "status",
    InventoryControls: "panel",
    StageWorkspace: "workspace",
    StageViewport: "viewport",
    StageViewButtons: "nav",
    StagePreviewNotice: "notice",
    construction_text: (value) => value,
    ComponentConstructionDocument: "document",
    ComponentVariants: "variants",
    ComponentStageLightingControls: "lighting",
    ComponentNameEdit: "name-edit",
    PreviewAnimationToggle: "animation-toggle",
    PreviewScaleControls: "scale-controls",
  });
  const draft = { id: "doc-1", name: "Grass strip", objects: [] };
  const editor = {
    history: { present: draft, past: [], future: [] },
    revision: 2,
    busy: false,
    dirty: false,
    edit() {},
    async rename() {
      return true;
    },
  };
  h.reset();
  cursor_ref = 0;
  const tree = stage({
    editor,
    folder_control: { type: "folder-move", props: {} },
  });
  const all = (node) =>
    !node || typeof node !== "object" ? [] : [node, ...kids(node).flatMap(all)];
  const workspace = all(tree).find((node) => node.type === "workspace");
  const panel = kids(workspace).find((node) => node?.type === "panel");
  assert.equal(panel.props["aria-label"], "asset");
  assert.deepEqual(
    kids(panel)
      .filter(Boolean)
      .map((node) => node.type),
    ["name-edit", "folder-move", "scale-controls", "lighting", "variants"],
  );
  const [name, , scale, lighting] = kids(panel).filter(Boolean);
  assert.equal(scale.props.scale, 1);
  assert.equal(scale.props.height, null);
  assert.equal(name.props.name, "Grass strip");
  assert.equal(name.props.on_rename, editor.rename, "names save at once");
  assert.equal(lighting.props.document, draft);
  // Lighting and the folder control left the toolbar and view buttons.
  for (const type of ["toolbar", "nav"]) {
    const bar = all(tree).find((node) => node.type === type);
    assert.equal(
      all(bar).some((node) => ["lighting", "folder-move"].includes(node.type)),
      false,
      type,
    );
  }
});

test("an immediate rename keeps other unsaved edits and survives undo", async () => {
  const { create_component_document } =
    await import("@fracto/sdk/FractoComponentDocument.js");
  const { component_document_reducer: reduce, component_is_dirty: dirty } =
    await import("../src/pages/games/ComponentDocumentState.js");
  const document = create_component_document(crypto.randomUUID(), "Path");
  let state = reduce({}, { type: "open", document, revision: 1 });
  const lit = {
    ...document,
    lighting: { direction_degrees: 90, intensity: 2 },
  };
  state = reduce(state, { type: "edit", document: lit });
  assert.equal(dirty(state), true);
  state = reduce(state, {
    type: "renamed",
    document: { ...document, name: "Wooded path" },
    revision: 2,
  });
  assert.equal(state.revision, 2);
  assert.equal(state.history.present.name, "Wooded path");
  assert.equal(state.history.present.lighting.direction_degrees, 90);
  assert.equal(dirty(state), true, "the lighting edit is still unsaved");
  state = reduce(state, { type: "undo" });
  assert.equal(state.history.present.name, "Wooded path");
  assert.equal(dirty(state), false);
  // Another document's response is ignored.
  const other = create_component_document(crypto.randomUUID(), "Other");
  assert.equal(
    reduce(state, { type: "renamed", document: other, revision: 9 }),
    state,
  );
});

test("editor.rename saves only the name on the saved document with its revision", async () => {
  const sdk = await import("@fracto/sdk/FractoComponentDocument.js");
  const state_module =
    await import("../src/pages/games/ComponentDocumentState.js");
  const saved = sdk.create_component_document(crypto.randomUUID(), "Path");
  const draft = { ...saved, lighting: { direction_degrees: 90, intensity: 2 } };
  const requests = [];
  let server_revision = 3;
  const h = hooks();
  let reducer_state = state_module.component_document_reducer(
    {},
    { type: "open", document: saved, revision: 3 },
  );
  reducer_state = state_module.component_document_reducer(reducer_state, {
    type: "edit",
    document: draft,
  });
  const hook = load("useComponentDocument.js", {
    useReducer: (reducer) => [
      reducer_state,
      (action) => (reducer_state = reducer(reducer_state, action)),
    ],
    useState: h.useState,
    useRef: (() => {
      const ref = { current: false };
      return () => ref;
    })(),
    useEffect: () => {},
    create_component_document: sdk.create_component_document,
    validate_component_document: sdk.validate_component_document,
    component_document_reducer: state_module.component_document_reducer,
    component_is_dirty: state_module.component_is_dirty,
    validate_component_response: (result) => ({
      document: sdk.validate_component_document(result.document),
      revision: result.revision,
    }),
    component_request: async (path, options = {}) => {
      requests.push({ path, options });
      if (!options.method)
        return { document: saved, revision: server_revision };
      const body = JSON.parse(options.body);
      server_revision = body.expected_revision + 1;
      return { document: body.document, revision: server_revision };
    },
  });
  h.reset();
  assert.equal(await hook().rename("Wooded path"), true);
  const put = requests.find((request) => request.options.method === "PUT");
  const body = JSON.parse(put.options.body);
  assert.equal(body.expected_revision, 3);
  assert.equal(body.document.name, "Wooded path");
  assert.deepEqual(
    body.document.lighting,
    saved.lighting,
    "draft edits are not saved",
  );
  assert.equal(reducer_state.revision, 4);
  assert.equal(reducer_state.history.present.name, "Wooded path");
  assert.equal(reducer_state.history.present.lighting.direction_degrees, 90);
  // A newer server revision is a conflict, and nothing is written.
  server_revision = 7;
  requests.length = 0;
  h.reset();
  assert.equal(await hook().rename("Other"), false);
  assert.equal(
    requests.some((request) => request.options.method === "PUT"),
    false,
  );
});

test("a failed name save keeps the editor open with the draft", async () => {
  const f = name_fixture();
  const render = () => f.render({ on_rename: async () => false });
  kids(render())[1].props.on_click();
  kids(kids(render())[0])[0].props.onChange({ target: { value: "Meadow" } });
  await kids(render())[0].props.onSubmit({ preventDefault() {} });
  const form = kids(render())[0];
  assert.equal(form.props.as, "form");
  assert.equal(kids(form)[0].props.value, "Meadow");
});
