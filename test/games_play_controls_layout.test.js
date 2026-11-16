import assert from "node:assert/strict";
import test from "node:test";
import { game_controls_layout } from "../src/pages/games/GamesPlayControlsLayout.js";

test("instruments and controller fit the measured game area at desktop, compact, and fullscreen sizes", () => {
  for (const [width, height] of [
    [1200, 700],
    [768, 500],
    [767, 500],
    [390, 650],
    [320, 320],
    [900, 300],
    [1920, 1080],
  ]) {
    const layout = game_controls_layout(width, height);
    const {
      instrument_size: size,
      controller_width,
      controller_height,
    } = layout;
    const group_width = layout.compact ? 3 * size + 16 : 2 * size + 8;
    const content_width = layout.compact
      ? Math.max(group_width, controller_width)
      : 2 * group_width + controller_width;
    const content_height = layout.compact
      ? 2 * (size + 16) + controller_height + 16
      : Math.max(2 * (size + 16) + 8, controller_height);
    assert.ok(content_width <= width - 32 + 0.01, `${width}x${height}: width`);
    assert.ok(
      content_height + 24 + 16 <= height - 32,
      `${width}x${height}: height`,
    );
    assert.ok(size >= 0 && size <= 112);
    assert.ok(controller_width <= 352);
    assert.ok(layout.dock_width <= width - 32 + 0.01);
    assert.equal(
      layout.dock_width,
      layout.compact
        ? Math.max(controller_width, ...layout.group_widths)
        : controller_width + layout.group_widths[0] + layout.group_widths[1],
    );
    assert.equal(layout.compact, width < 768);
  }
});

test("unmeasured bounds produce finite, nonnegative sizes", () => {
  for (const bounds of [
    [0, 0],
    [NaN, undefined],
    [-1, -1],
  ]) {
    const layout = game_controls_layout(...bounds);
    for (const key of [
      "controller_width",
      "controller_height",
      "instrument_size",
    ]) {
      assert.ok(Number.isFinite(layout[key]));
      assert.ok(layout[key] >= 0);
    }
  }
});
