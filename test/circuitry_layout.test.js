import assert from "node:assert/strict";
import { test } from "node:test";
import { circuitry_layout } from "../src/pages/study/circuitry/CircuitryLayout.js";

test("circuitry columns fit the width budget and the distance chart is half-height", () => {
  for (const width of [500, 650, 850, 1000, 1400]) {
    const layout = circuitry_layout(width, 600);
    assert.ok(layout.options_width >= 260);
    assert.ok(layout.chart_size + layout.options_width + 32 <= width);
    assert.equal(layout.distance_chart_width, layout.options_width);
    assert.equal(
      layout.distance_chart_height,
      Math.floor(layout.chart_size / 2),
    );
  }
  assert.equal(circuitry_layout(1000, 600).chart_size, 510);
  assert.equal(circuitry_layout(1000, 600).distance_chart_height, 255);
  assert.equal(circuitry_layout(1200, 600).options_width, 584);
  assert.equal(circuitry_layout(1400, 600).options_width, 600);
});

test("wide panes consume the previously unused 80px without breaking the height ratio", () => {
  const before = circuitry_layout(1052, 600);
  const after = circuitry_layout(1132, 600);
  assert.equal(before.chart_size, 510);
  assert.equal(after.chart_size, 550);
  assert.equal(after.options_width, 550);
  assert.equal(after.chart_size + after.options_width + 32, 1132);
  assert.equal(after.distance_chart_height, 275);
  assert.equal(
    after.chart_size +
      after.options_width -
      (before.chart_size + before.options_width),
    80,
  );
});
