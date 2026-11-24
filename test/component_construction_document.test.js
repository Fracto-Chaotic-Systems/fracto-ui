import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { randomUUID } from "node:crypto";
import {
  create_component_document,
  COMPONENT_DESCRIPTION_LIMIT,
} from "@fracto/sdk/FractoComponentDocument.js";
import {
  component_document_reducer as reduce,
  component_is_dirty,
} from "../src/pages/games/ComponentDocumentState.js";

const nodes = (tree) =>
  !tree || typeof tree !== "object"
    ? []
    : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
function harness() {
  const slots = [];
  let cursor = 0;
  const source = readFileSync(
    new URL(
      "../src/pages/games/ComponentConstructionDocument.jsx",
      import.meta.url,
    ),
    "utf8",
  ).replace(/^import[\s\S]*?;\r?\n/gm, "");
  const module = { exports: {} };
  runInNewContext(
    transformSync(source, { loader: "jsx", format: "cjs", jsx: "automatic" })
      .code,
    {
      module,
      exports: module.exports,
      require: createRequire(import.meta.url),
      AppText: { get: (key) => key },
      COMPONENT_STAGE_TEXT: new Proxy({}, { get: (_, key) => key }),
      COMPONENT_DESCRIPTION_LIMIT,
      MarkdownDocument: "markdown",
      ConstructionDocumentStyles: "section",
      ConstructionDocumentBody: "article",
      useState(initial) {
        const i = cursor++;
        if (!(i in slots)) slots[i] = initial;
        return [slots[i], (value) => (slots[i] = value)];
      },
    },
  );
  return (props) => {
    cursor = 0;
    return module.exports.default(props);
  };
}
test("construction document edits are part of the component save/load and undo history", () => {
  const render = harness(),
    document = {
      ...create_component_document(randomUUID(), "Grass strip"),
      construction_description: "# Grass\n\nUse **openings**.",
    };
  let state = reduce({}, { type: "open", document, revision: 8 });
  const props = () => ({
    document: state.history.present,
    disabled: false,
    hidden: false,
    on_change: (doc) =>
      (state = reduce(state, { type: "edit", document: doc })),
  });
  let tree = render(props());
  const markdown = nodes(tree).find((n) => n.type === "markdown");
  assert.equal(markdown.props.children, document.construction_description);
  assert.equal(
    markdown.props.components.a({
      children: "Source",
      href: "javascript:evil()",
    }).props.href,
    undefined,
  );
  assert.equal(
    markdown.props.components.img({
      alt: "Reference",
      src: "https://example.invalid/tracker",
    }).props.src,
    undefined,
  );
  nodes(tree)
    .find((n) => n.type === "button" && n.props.children === "document_edit")
    .props.onClick();
  tree = render(props());
  const input = nodes(tree).find((n) => n.type === "textarea");
  assert.equal(input.props.maxLength, COMPONENT_DESCRIPTION_LIMIT);
  input.props.onChange({
    target: { value: "# Grass\n\nChanged distribution." },
  });
  assert.equal(component_is_dirty(state), true);
  assert.deepEqual(state.history.present.objects, document.objects);
  state = reduce(state, { type: "undo" });
  assert.equal(
    state.history.present.construction_description,
    document.construction_description,
  );
  state = reduce(state, { type: "redo" });
  const saved = state.history.present;
  state = reduce(state, { type: "saved", document: saved, revision: 9 });
  assert.equal(component_is_dirty(state), false);
  state = reduce(
    {},
    { type: "open", document: JSON.parse(JSON.stringify(saved)), revision: 9 },
  );
  tree = render({ ...props(), disabled: true });
  assert.equal(
    nodes(tree).find((n) => n.type === "textarea").props.value,
    saved.construction_description,
  );
  assert.equal(
    nodes(tree).find((n) => n.type === "textarea").props.disabled,
    true,
  );
  assert.equal(render({ ...props(), hidden: true }).props.hidden, true);
});
test("older components start with an empty editable document", () => {
  const render = harness();
  const props = {
    document: create_component_document(randomUUID(), "New"),
    on_change() {},
    disabled: false,
  };
  let tree = render(props);
  assert.ok(nodes(tree).some((n) => n.props.children === "document_empty"));
  nodes(tree)
    .find((n) => n.type === "button" && n.props.children === "document_edit")
    .props.onClick();
  tree = render(props);
  assert.equal(nodes(tree).find((n) => n.type === "textarea").props.value, "");
});
