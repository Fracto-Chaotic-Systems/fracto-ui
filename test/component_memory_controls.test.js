import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";

function component(filename, extra = {}) {
  const slots = [];
  let cursor = 0;
  const module = { exports: {} };
  const source = readFileSync(
    new URL(`../src/pages/games/${filename}`, import.meta.url),
    "utf8",
  ).replace(/^import[\s\S]*?;\r?\n/gm, "");
  runInNewContext(
    transformSync(source, { loader: "jsx", format: "cjs", jsx: "automatic" })
      .code,
    {
      module,
      exports: module.exports,
      require: createRequire(import.meta.url),
      crypto: { randomUUID },
      text: (key) => key,
      ComponentMemoryForm: "memory-form",
      useState(value) {
        const i = cursor++;
        if (!(i in slots)) slots[i] = value;
        return [
          slots[i],
          (next) =>
            (slots[i] = typeof next === "function" ? next(slots[i]) : next),
        ];
      },
      ...extra,
    },
  );
  return (props) => {
    cursor = 0;
    return module.exports.default(props);
  };
}
const nodes = (tree) =>
  !tree || typeof tree !== "object"
    ? []
    : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
const button = (tree, label) =>
  nodes(tree).find(
    (node) => node.type === "button" && node.props.children === label,
  );
test("remember-this and applied recipes open review forms without writing until Save", () => {
  const render = component("ComponentMemoryPanel.jsx");
  let writes = 0;
  const props = {
    brief: "Keep a wide path",
    disabled: false,
    memory: {
      library: { patterns: [] },
      save: () => {
        writes++;
        return true;
      },
    },
    planner: {
      entries: [],
      last_applied: {
        brief: "A path",
        summary: "Grass borders",
        assumptions: ["2m corridor"],
      },
    },
  };
  let tree = render(props);
  button(tree, "remember").props.onClick();
  tree = render(props);
  let form = nodes(tree).find((node) => node.type === "memory-form");
  assert.equal(form.props.initial.instructions, props.brief);
  assert.equal(form.props.initial.kind, "preference");
  assert.equal(writes, 0);
  form.props.on_save(
    { ...form.props.initial, title: "Open paths", revision: 1 },
    0,
  );
  assert.equal(writes, 1);
  tree = render(props);
  button(tree, "save_recipe").props.onClick();
  tree = render(props);
  form = nodes(tree).find((node) => node.type === "memory-form");
  assert.equal(form.props.initial.kind, "recipe");
  assert.match(form.props.initial.instructions, /Grass borders/);
  assert.match(form.props.initial.instructions, /2m corridor/);
  assert.equal(writes, 1);
});
test("inspection exposes complete pattern data; edits and deletes require deliberate controls", () => {
  const render = component("ComponentMemoryPanel.jsx"),
    pattern = {
      id: randomUUID(),
      revision: 3,
      title: "Open paths",
      instructions: "Keep the complete corridor clear.",
      keywords: ["path"],
      kind: "preference",
      enabled: true,
    };
  let removed = 0,
    toggled = 0;
  const props = {
    brief: "",
    disabled: false,
    planner: { entries: [] },
    memory: {
      library: { patterns: [pattern] },
      toggle: (value) => {
        assert.equal(value, pattern);
        toggled++;
      },
      remove: (value) => {
        assert.equal(value, pattern);
        removed++;
        return true;
      },
    },
  };
  let tree = render(props);
  assert.ok(
    nodes(tree).some((node) => node.props?.children === pattern.instructions),
  );
  button(tree, "disable").props.onClick();
  assert.equal(toggled, 1);
  button(tree, "edit").props.onClick();
  tree = render(props);
  const form = nodes(tree).find((node) => node.type === "memory-form");
  assert.equal(form.props.initial, pattern);
  button(tree, "delete").props.onClick();
  tree = render(props);
  assert.equal(removed, 0);
  button(tree, "confirm_delete").props.onClick();
  assert.equal(removed, 1);
});
test("pattern form preserves its revision and submits explicitly edited instructions and keyword scope", () => {
  const render = component("ComponentMemoryForm.jsx"),
    initial = {
      id: randomUUID(),
      revision: 4,
      title: "Old",
      instructions: "Old instructions",
      keywords: [],
      kind: "preference",
      enabled: true,
    };
  let saved;
  const props = {
    initial,
    disabled: false,
    on_save: (value, revision) => (saved = { value, revision }),
  };
  let tree = render(props);
  nodes(tree)
    .find((node) => node.type === "input" && node.props.value === "Old")
    .props.onChange({ target: { value: "New" } });
  nodes(tree)
    .find((node) => node.type === "textarea")
    .props.onChange({ target: { value: "Use a 3 meter path" } });
  nodes(tree)
    .find((node) => node.type === "input" && node.props.maxLength === 155)
    .props.onChange({ target: { value: "Path, Forest" } });
  tree = render(props);
  tree.props.onSubmit({ preventDefault() {} });
  assert.equal(saved.revision, 4);
  assert.equal(saved.value.revision, 5);
  assert.equal(saved.value.title, "New");
  assert.equal(saved.value.instructions, "Use a 3 meter path");
  assert.equal(saved.value.keywords.join(","), "path,forest");
});
