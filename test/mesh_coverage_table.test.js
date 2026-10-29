import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";

function harness() {
  const source = readFileSync(
    new URL("../src/pages/tiles/MeshCoverageTable.jsx", import.meta.url),
    "utf8",
  )
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace(
      "export function mesh_coverage_rows",
      "function mesh_coverage_rows",
    )
    .replace(
      "export default function MeshCoverageTable",
      "function MeshCoverageTable",
    );
  const sandbox = {
    React: {
      createElement: (type, props, ...children) => ({ type, props, children }),
    },
    CoolTable: "table",
    CoolStyles: { LinkSpan: "count-action" },
    PropTypes: {
      object: { isRequired: true },
      array: {},
      func: { isRequired: true },
    },
    CELL_ALIGN_CENTER: "center",
    CELL_TYPE_CALLBACK: "callback",
    CELL_TYPE_NUMBER: "number",
    TABLE_MULTI_SELECT: "multi",
    MESH_MAP_TEXT: Object.fromEntries(
      ["shade", "level", "tile_count", "mesh_count", "can_do"].map((key) => [
        key,
        key,
      ]),
    ),
    render_level_color: (color) => color,
    FractoColors: { get_heat_map_greys_map: () => ({ _10: 120 }) },
  };
  vm.runInNewContext(
    transformSync(`${source}\nglobalThis.Table = MeshCoverageTable;`, {
      loader: "jsx",
    }).code,
    sandbox,
  );
  return sandbox.Table;
}
const result = {
  heat_map_buffer: [[[0, 10]]],
  coverage: [
    { level: 3, tile_count: 10, mesh_count: 0 },
    { level: 10, tile_count: 20, mesh_count: 3 },
  ],
};

const numeral = value => typeof value === "object" ? value.children[0] : value;

test("mesh table matches Generate columns and displays clickable positive can-do counts", () => {
  const Table = harness();
  const table = Table({
    result,
    selected_levels: null,
    on_select_level() {},
    on_select_all() {},
  });
  assert.deepEqual(
    Array.from(table.props.columns, (column) => column.label_key),
    ["shade", "level", "tile_count", "mesh_count", "can_do"],
  );
  assert.ok(
    table.props.columns
      .slice(1)
      .every((column) => column.type === "number" && !column.on_click),
  );
  assert.deepEqual(
    Array.from(table.props.data, (row) => [
      row.tile_count,
      row.mesh_count,
      numeral(row.can_do),
    ]),
    [
      [10, 0, 10],
      [20, 3, 17],
    ],
  );
  assert.equal(table.props.data[0].color[1], "#d9ffff");
  assert.equal(table.props.data[1].color[1], "rgb(120,120,120)");
});

test("mesh table has no checkbox selection column and preserves literal negative differences", () => {
  const Table = harness(),
    selections = [],
    all = [];
  const table = Table({
    result,
    selected_levels: [10],
    on_select_level: (level) => selections.push(level),
    on_select_all: (value) => all.push(value),
  });
  assert.equal(table.props.options, undefined);
  assert.equal(table.props.selected_rows, undefined);
  assert.equal(table.props.on_select_row, undefined);
  assert.equal(table.props.on_select_all, undefined);
  assert.deepEqual(selections, []);
  assert.deepEqual(all, []);
  const orphan = Table({
    result: {
      ...result,
      coverage: [{ level: 10, tile_count: 1, mesh_count: 2 }],
    },
    on_select_level() {},
    on_select_all() {},
  });
  assert.equal(orphan.props.data[0].can_do, -1);
});

test("table includes the first level exceeding 50000 and hides every subsequent level", () => {
  const Table = harness();
  const props = {
    result: {
      ...result,
      coverage: [
        { level: 7, tile_count: 1, mesh_count: 0 },
        { level: 5, tile_count: 50002, mesh_count: 2 },
        { level: 4, tile_count: 50000, mesh_count: 2 },
        { level: 6, tile_count: 50003, mesh_count: 2 },
      ],
    },
    on_select_level() {},
    on_select_all() {},
  };
  const table = Table(props);
  assert.deepEqual(
    Array.from(table.props.data, (row) => [row.level, numeral(row.can_do)]),
    [
      [4, 49998],
      [5, 50000],
      [6, 50001],
    ],
  );
  const changed = Table({
    ...props,
    result: {
      ...result,
      coverage: props.result.coverage.map((row) => ({
        ...row,
        tile_count: 10,
      })),
    },
  });
  assert.deepEqual(
    Array.from(changed.props.data, (row) => row.level),
    [4, 5, 6, 7],
  );
});

test("a can-do click passes its exact count and level and active jobs disable count actions", () => {
  const Table = harness(), clicks = [];
  const table = Table({ result, on_transform: selection => clicks.push(selection) });
  table.props.data[1].can_do.props.onClick({ stopPropagation() {} });
  assert.equal(clicks[0].count, 17); assert.equal(clicks[0].level, 10);
  const disabled = Table({ result, disabled: true, on_transform() { assert.fail("disabled action"); } });
  assert.equal(disabled.props.data[1].can_do, 17);
});
