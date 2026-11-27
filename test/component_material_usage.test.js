import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { randomUUID } from "node:crypto";
import { transformSync } from "esbuild";
import {
  create_component_document,
  validate_component_document,
} from "@fracto/sdk/FractoComponentDocument.js";
import {
  component_material_usage,
  group_material_usage,
  scatter_area,
} from "../src/pages/games/ComponentMaterialUsage.js";

const asset = (id, revision = "r1") => ({ id, revision });
const object = (id, scale = [1, 1, 1], extra = {}) => ({
  id: randomUUID(),
  asset: asset(id),
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale,
  group_id: null,
  ...extra,
});
function sample() {
  const document = create_component_document(randomUUID(), "Meadow");
  document.floor = {
    asset: asset("dry-dirt"),
    size: [2, 10],
    texture_repeat: [2, 10],
  };
  document.objects = [
    object("yard-grass", [0.2, 0.3, 0.2]),
    object("yard-grass", [0.5, 0.5, 0.5]),
    object("ladybug", [1.5, 1.5, 1.5], {
      motion: undefined,
    }),
  ];
  delete document.objects[2].motion;
  document.scatters = [
    {
      id: randomUUID(),
      asset: asset("yard-grass", "r2"),
      seed: 1,
      count: 30,
      bounds: [-1, -5, 1, 5],
      exclusions: [
        [-1, -1, 1, 1],
        [0, 4, 3, 9],
      ],
      scale: [0.1, 0.6],
      group_id: null,
    },
  ];
  return validate_component_document(document);
}

test("usage totals placed, scattered and floor use per material", () => {
  const usage = component_material_usage(sample());
  assert.equal(usage.instances, 33);
  assert.equal(usage.limit, 1000);
  assert.equal(usage.floor_area, 20);
  assert.equal(usage.scatter_rules, 1);
  const [grass, ladybug, dirt] = usage.materials;
  assert.equal(grass.id, "yard-grass");
  assert.equal(grass.placed, 2);
  assert.equal(grass.scattered, 30);
  assert.equal(grass.instances, 32);
  assert.equal(grass.scatter_rules, 1);
  // 2 × 10 bounds minus a 2 × 2 exclusion and the 1 × 1 part of one that pokes out.
  assert.equal(grass.scatter_area, 15);
  assert.equal(grass.density, 2);
  assert.equal(grass.per_floor_m2, 1.6);
  assert.deepEqual([grass.scale_min, grass.scale_max], [0.1, 0.6]);
  assert.deepEqual(grass.revisions, ["r1", "r2"]);
  assert.equal(ladybug.placed, 1);
  assert.equal(ladybug.instances, 1);
  assert.equal(dirt.id, "dry-dirt");
  assert.equal(dirt.instances, 0);
  assert.equal(dirt.scale_min, null);
  assert.deepEqual(dirt.floor, {
    width: 2,
    depth: 10,
    area: 20,
    repeat: [2, 10],
  });
  assert.equal(
    scatter_area({ bounds: [0, 0, 1, 1], exclusions: [[-5, -5, 5, 5]] }),
    0,
  );
});

test("moving objects are counted and an empty component has no rows", () => {
  const document = create_component_document(randomUUID(), "Bugs");
  document.objects = [object("ladybug")];
  document.objects[0].motion = {
    algorithm: "patrol-v1",
  };
  const plain = component_material_usage(
    create_component_document(randomUUID(), "Empty"),
  );
  assert.deepEqual(plain.materials, []);
  assert.equal(plain.floor_area, null);
  const usage = component_material_usage({ ...document, scatters: [] });
  assert.equal(usage.materials[0].moving, 1);
});

test("five or more materials of one family collapse into a summed group", () => {
  const document = create_component_document(randomUUID(), "Rocks");
  document.floor = {
    asset: asset("dry-dirt"),
    size: [1, 20],
    texture_repeat: [1, 20],
  };
  document.objects = [
    ...Array.from({ length: 6 }, (_, i) =>
      object(`rocks-piece-00${i + 1}`, [
        0.02 + i / 100,
        0.02 + i / 100,
        0.02 + i / 100,
      ]),
    ),
    object("yard-grass"),
    object("yard-grass"),
  ];
  const usage = component_material_usage(validate_component_document(document));
  const rows = group_material_usage(usage.materials);
  assert.deepEqual(
    rows.map((row) => [row.kind, row.id]),
    [
      ["group", "rocks-piece"],
      ["material", "yard-grass"],
      ["material", "dry-dirt"],
    ],
  );
  const rocks = rows[0];
  assert.equal(rocks.members.length, 6);
  assert.equal(rocks.placed, 6);
  assert.equal(rocks.instances, 6);
  assert.ok(Math.abs(rocks.scale_min - 0.02) < 1e-12);
  assert.ok(Math.abs(rocks.scale_max - 0.07) < 1e-12);
  assert.ok(Math.abs(rocks.per_floor_m2 - 0.3) < 1e-12);
  // The catalog folder names the family when known; small families stay rows.
  const catalog = Object.fromEntries(
    usage.materials.map((entry) => [
      entry.id,
      { folder_path: entry.id.startsWith("rocks") ? "terrain/rocks" : "" },
    ]),
  );
  assert.equal(
    group_material_usage(usage.materials, catalog)[0].id,
    "terrain/rocks",
  );
  assert.equal(
    group_material_usage(usage.materials, catalog, 10).some(
      (row) => row.kind === "group",
    ),
    false,
  );
});

function tab_fixture(catalog_assets) {
  const source = readFileSync(
    new URL("../src/pages/games/ComponentMaterialsTab.jsx", import.meta.url),
    "utf8",
  ).replace(/^import[\s\S]*?;\r?\n/gm, "");
  const state = [];
  let cursor = 0,
    effect = null,
    pending = null;
  const module = { exports: {} };
  runInNewContext(
    transformSync(source, {
      loader: "jsx",
      format: "cjs",
      jsx: "automatic",
      define: { "import.meta.env.BASE_URL": '"/"' },
    }).code,
    {
      module,
      exports: module.exports,
      require: createRequire(import.meta.url),
      Fragment: "fragment",
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
      useMemo: (compute) => compute(),
      useEffect: (callback) => {
        effect = callback;
      },
      AbortController,
      AppText: { get: (key) => key },
      COMPONENT_STAGE_TEXT: new Proxy({}, { get: (_, key) => key }),
      component_material_usage,
      group_material_usage,
      MaterialUsageTable: "table",
      fetch_inventory_assets: async (url) => {
        assert.match(url, /environment-catalog\?category=material$/);
        pending = Promise.resolve(catalog_assets);
        return pending;
      },
    },
  );
  const render = (document) => {
    cursor = 0;
    return module.exports.default({ document });
  };
  return {
    render,
    load: async () => {
      effect();
      await new Promise((resolve) => setTimeout(resolve, 0));
    },
  };
}
const all = (node) =>
  !node || typeof node !== "object"
    ? []
    : Array.isArray(node)
      ? Array.from(node).flatMap(all)
      : [node, ...all(node.props?.children)];
const text_of = (node) =>
  typeof node === "string" || typeof node === "number"
    ? String(node)
    : Array.isArray(node)
      ? Array.from(node).map(text_of).join("")
      : node?.props
        ? text_of(node.props.children)
        : "";

test("the materials tab lists catalog names, hides unused columns and expands groups", async () => {
  const document = create_component_document(randomUUID(), "Rocks");
  document.floor = {
    asset: asset("dry-dirt"),
    size: [1, 20],
    texture_repeat: [1, 20],
  };
  document.objects = [
    ...Array.from({ length: 5 }, (_, i) => object(`rocks-piece-00${i + 1}`)),
    object("yard-grass"),
  ];
  const f = tab_fixture([
    { id: "yard-grass", name: "Yard grass", folder_path: "plants" },
    { id: "dry-dirt", name: "Dry dirt", folder_path: "terrain" },
  ]);
  f.render(validate_component_document(document));
  await f.load();
  let tree = f.render(validate_component_document(document));
  const headers = all(tree)
    .filter((node) => node.type === "th" && node.props.scope === "col")
    .map(text_of);
  // No scatter rules: no scatter columns; a floor: per-floor and floor columns.
  assert.deepEqual(headers, [
    "materials_material",
    "materials_placed",
    "materials_total",
    "materials_scale",
    "materials_per_floor",
    "materials_floor",
  ]);
  const body = all(tree).find((node) => node.type === "tbody");
  const rows = all(body).filter((node) => node.type === "tr");
  assert.equal(rows.length, 3);
  assert.match(text_of(rows[0]), /rocks-piece/);
  assert.match(text_of(rows[1]), /^Yard grassyard-grass1/);
  assert.match(text_of(rows[2]), /Dry dirt/);
  assert.match(text_of(rows[2]), /1\.0 × 20\.0 m/);
  const toggle = all(rows[0]).find((node) => node.type === "button");
  assert.equal(toggle.props["aria-expanded"], false);
  toggle.props.onClick();
  tree = f.render(validate_component_document(document));
  const expanded = all(all(tree).find((node) => node.type === "tbody")).filter(
    (node) => node.type === "tr",
  );
  assert.equal(expanded.length, 8);
  assert.equal(expanded[1].props.className, "material-member");
  assert.match(
    text_of(all(tree).find((node) => node.type === "tfoot")),
    /materials_instances/,
  );
  const empty = f.render(create_component_document(randomUUID(), "Empty"));
  assert.equal(text_of(empty), "materials_none");
});
