import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { setImmediate } from "node:timers";
import { transformSync } from "esbuild";

function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  return node && typeof node === "object"
    ? [node, ...nodes(node.props?.children)]
    : [];
}

test("variants panel lists the current component, clears stale results, handles empty/error and cancels old requests", async () => {
  const source = readFileSync(
    new URL("../src/pages/games/ComponentVariants.jsx", import.meta.url),
    "utf8",
  ).replace(/^import[^;]+;\r?\n/gm, "");
  const module = { exports: {} },
    slots = [],
    pending = [];
  let cursor, old_deps, cleanup;
  runInNewContext(
    transformSync(source, { loader: "jsx", format: "cjs", jsx: "automatic" })
      .code,
    {
      module,
      exports: module.exports,
      require: createRequire(import.meta.url),
      AbortController,
      AppText: { get: (key) => key },
      COMPONENT_STAGE_TEXT: new Proxy({}, { get: (_, key) => key }),
      InventoryControls: "aside",
      InventoryCaption: "p",
      VariantButton: "button",
      useState(initial) {
        const i = cursor++;
        if (!(i in slots)) slots[i] = initial;
        return [
          slots[i],
          (value) =>
            (slots[i] = typeof value === "function" ? value(slots[i]) : value),
        ];
      },
      useEffect(effect, deps) {
        if (!old_deps || deps.some((v, i) => v !== old_deps[i])) {
          cleanup?.();
          old_deps = deps;
          cleanup = effect();
        }
      },
      component_request(path, options) {
        return new Promise((resolve, reject) =>
          pending.push({ path, ...options, resolve, reject }),
        );
      },
    },
  );
  let selected_key = null,
    clicked = null;
  const render = (id) => {
    cursor = 0;
    return module.exports.default({
      component_id: id,
      selected_key,
      on_select: (variant) => (clicked = variant),
    });
  };
  const content = (tree) => JSON.stringify(tree);
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  assert.match(content(render("grass")), /variants_loading/);
  assert.equal(pending[0].path, "/grass/variants");
  const variant = {
    key: "zoomies",
    name: "Ladybug zoomies",
    overrides: [
      {
        target: { property: "motion.algorithm", role: "walking_insects" },
        operation: "replace",
        value: "facing-wander-v1",
      },
      {
        target: { property: "motion.speed_mps", role: "walking_insects" },
        operation: "multiply",
        value: 8,
      },
    ],
  };
  pending[0].resolve({ variants: [variant] });
  await flush();
  assert.match(content(render("grass")), /Ladybug zoomies/);
  assert.match(content(render("grass")), /8×/);
  assert.match(content(render("grass")), /variant_wander/);
  let button = nodes(render("grass")).find((n) => n.type === "button");
  assert.equal(button.props["aria-pressed"], false);
  button.props.onClick();
  assert.equal(clicked.name, "Ladybug zoomies");
  selected_key = "zoomies";
  button = nodes(render("grass")).find((n) => n.type === "button");
  assert.equal(button.props["aria-pressed"], true);
  let tree = render("other");
  assert.doesNotMatch(content(tree), /Ladybug zoomies/);
  assert.equal(pending[0].signal.aborted, true);
  pending[1].resolve({ variants: [] });
  await flush();
  assert.match(content(render("other")), /variants_empty/);
  render("failed");
  pending[2].reject(Error("offline"));
  await flush();
  tree = render("failed");
  assert.match(content(tree), /variants_error/);
  nodes(tree)
    .find((node) => node.type === "button")
    .props.onClick();
  render("failed");
  render("newer");
  assert.equal(pending[3].signal.aborted, true);
  pending[3].resolve({ variants: [variant] });
  await flush();
  assert.doesNotMatch(content(render("newer")), /Ladybug zoomies/);
  pending[4].resolve({ variants: [] });
  await flush();
  assert.match(content(render("newer")), /variants_empty/);
  cleanup();
});
