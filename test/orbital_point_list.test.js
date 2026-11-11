import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { format_orbital_point } from "../src/pages/study/points/PointsOrbitalPointFormat.js";

test("point list preserves stored decimal digits and tracks original point indices", () => {
  const point = {
    point_index: 4,
    point: { re: "-0.12345678901234567890123456789012", im: "1e-32" },
    landing_ratios: [{ numerator: "1", denominator: "7" }, { numerator: "2", denominator: "7" }],
  };
  assert.deepEqual(format_orbital_point(point), {
    ratios: "1/7, 2/7", real: "-0.12345678901234567890123456789012",
    imaginary: "0.00000000000000000000000000000001",
  });
  assert.deepEqual(format_orbital_point({ point: { re: "0", im: "-2" } }), {
    ratios: "—", real: "0.00000000000000000000000000000000",
    imaginary: "-2.00000000000000000000000000000000",
  });
  const source = readFileSync(new URL("../src/pages/study/points/PointsOrbitalPointList.jsx", import.meta.url), "utf8")
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace("export default function", "function");
  const List = runInNewContext(transformSync(source, { loader: "jsx" }).code + ";PointsOrbitalPointList", {
    React: { createElement: (type, props, ...children) => ({ type, props, children }) },
    useMemo: (callback) => callback(),
    format_orbital_point,
    CoolTable: "table", CELL_TYPE_CALLBACK: "callback", TABLE_NO_BORDER: "no-border",
    TABLE_NO_HEADER: "no-header",
    TABLE_CAN_SELECT: "selectable",
    CELL_ALIGN_CENTER: "center", CELL_ALIGN_LEFT: "left",
  });
  const selected_orbital = { points: [{ ...point, point_index: 0 }, point] };
  const selections = [];
  const table = List({ selected_orbital, active_point_index: 4, on_select_point: (index) => selections.push(index) }).children[0];
  assert.ok(table.props.options.includes("selectable"));
  table.props.on_select_row(1);
  table.props.on_select_row(0);
  table.props.on_select_row(-1);
  assert.deepEqual(selections, [4, 0]);
  assert.equal(table.props.selected_row, 1);
  assert.equal(table.props.scroll_selected_row, true);
  for (const column of ["ratios", "real", "imaginary"]) {
    assert.equal(table.props.data[1][column][1], format_orbital_point(point)[column]);
  }
  assert.deepEqual(Array.from(table.props.columns, (column) => column.align), ["center", "left", "left"]);
  assert.equal(List({ selected_orbital: null }), null);
  assert.equal(List({ selected_orbital, active_point_index: -1 }).children[0].props.selected_row, -1);
});
