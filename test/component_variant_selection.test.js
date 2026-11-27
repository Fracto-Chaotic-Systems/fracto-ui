import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { transformSync } from "esbuild";
import {
  create_component_document,
  component_document_json,
} from "@fracto/sdk/FractoComponentDocument.js";
import { preview_component_variant } from "@fracto/sdk/FractoComponentVariant.js";

function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  return node && typeof node === "object"
    ? [node, ...nodes(node.props?.children)]
    : [];
}

test("stage toggles a single variant, restores the base and keeps preview out of authored history", () => {
  const base = create_component_document(randomUUID(), "Grass strip"),
    group = randomUUID();
  base.groups = [{ id: group, name: "Insects" }];
  base.objects = [
    {
      id: randomUUID(),
      asset: { id: "ladybug", revision: "a".repeat(64) },
      group_id: group,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      motion: {
        algorithm: "facing-patrol-v1",
        speed_mps: 0.006,
        distance_m: 0.04,
      },
    },
  ];
  const variant = {
    key: "zoomies",
    base: { component_id: base.id, scene_revision: 12 },
    role_groups: { walking_insects: group },
    overrides: [
      {
        target: { role: "walking_insects", property: "motion.speed_mps" },
        operation: "multiply",
        value: 8,
      },
      {
        target: {
          role: "walking_insects",
          property: "walk_clip.playback_rate",
        },
        operation: "multiply",
        value: 8,
      },
    ],
  };
  const source = readFileSync(
    new URL("../src/pages/games/ComponentStage.jsx", import.meta.url),
    "utf8",
  ).replace(/^import[^;]+;\r?\n/gm, "");
  const module = { exports: {} },
    state = [],
    effects = [],
    updates = [];
  let cursor,
    effect_index,
    edits = 0;
  runInNewContext(
    transformSync(source, { loader: "jsx", format: "cjs", jsx: "automatic" })
      .code,
    {
      module,
      exports: module.exports,
      require: createRequire(import.meta.url),
      useRef(initial) {
        const i = cursor++;
        return (state[i] ??= { current: initial });
      },
      useMemo: (fn) => fn(),
      useState(initial) {
        const i = cursor++;
        if (!(i in state)) state[i] = initial;
        return [
          state[i],
          (v) => (state[i] = typeof v === "function" ? v(state[i]) : v),
        ];
      },
      useEffect(fn, deps) {
        const i = effect_index++;
        if (!effects[i] || deps.some((v, j) => effects[i][j] !== v)) {
          effects[i] = deps;
          fn();
        }
      },
      create_component_stage: () => ({
        update_document: (document, options) =>
          updates.push({ document, options }),
        set_visible() {},
        set_preview() {},
        dispose() {},
      }),
      preview_component_variant,
      AppText: { get: (v) => v },
      COMPONENT_STAGE_TEXT: new Proxy({}, { get: (_, key) => key }),
      KEY_GAMES_COMPOSITES_TITLE: "components",
      MainStyles: { SectionTitle: "h2" },
      InventoryLayout: "div",
      StageHost: "div",
      InventoryControls: "aside",
      INVENTORY_TEXT: new Proxy({}, { get: (_, key) => key }),
      InventoryToolbar: "header",
      InventoryCaption: "p",
      InventoryStatus: "status",
      StageWorkspace: "workspace",
      StageViewport: "viewport",
      StageViewButtons: "nav",
      construction_text: (v) => v,
      ComponentConstructionDocument: "document",
      ComponentVariants: "variants",
      ComponentNameEdit: "name-edit",
      PreviewAnimationToggle: "animation-toggle",
      PreviewScaleControls: "scale-controls",
      ComponentStageLightingControls: "lighting-controls",
    },
  );
  const editor = {
    history: { present: base, past: [], future: [] },
    revision: 12,
    busy: false,
    dirty: false,
    edit: () => edits++,
  };
  const before = component_document_json(base);
  const render = () => {
    cursor = 0;
    effect_index = 0;
    return module.exports.default({ editor });
  };
  let tree = render();
  const panel = () => nodes(tree).find((n) => n.type === "variants").props;
  assert.equal(panel().selected_key, undefined);
  panel().on_select(variant);
  tree = render();
  assert.equal(panel().selected_key, "zoomies");
  assert.equal(updates.at(-1).document.objects[0].motion.speed_mps, 0.048);
  assert.equal(updates.at(-1).options.clip_rates[base.objects[0].id], 8);
  // The selected scene is derived separately; save still receives the original editor document.
  const other = structuredClone(variant);
  other.key = "quick";
  other.overrides.forEach((o) => (o.value = 3));
  panel().on_select(other);
  tree = render();
  assert.equal(panel().selected_key, "quick");
  assert.ok(
    Math.abs(updates.at(-1).document.objects[0].motion.speed_mps - 0.018) <
      1e-12,
  );
  panel().on_select(other);
  tree = render();
  assert.equal(panel().selected_key, undefined);
  assert.equal(updates.at(-1).document, base);
  assert.deepEqual(Object.keys(updates.at(-1).options.clip_rates), []);
  assert.equal(component_document_json(editor.history.present), before);
  assert.equal(edits, 0);
  assert.equal(editor.history.past.length, 0);
  panel().on_select({
    ...variant,
    base: { ...variant.base, scene_revision: 11 },
  });
  tree = render();
  assert.equal(panel().selected_key, null);
  assert.ok(nodes(tree).some((n) => n.props?.role === "alert"));
});
