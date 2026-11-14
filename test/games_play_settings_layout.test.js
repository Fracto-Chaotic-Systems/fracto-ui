import assert from "node:assert/strict";
import test from "node:test";
import { settings_drawer_layout } from "../src/pages/games/GamesPlaySettingsLayout.js";

test("default drawer occupies 30% of content width at every size", () => {
  assert.deepEqual(settings_drawer_layout(1000, -1), {
    position: 0.7,
    width: 300,
  });
  assert.deepEqual(settings_drawer_layout(2000, 0.7), {
    position: 0.7,
    width: 600,
  });
  assert.deepEqual(settings_drawer_layout(400), {
    position: 0.7,
    width: 120,
  });
});

test("saved position remains proportional when the content resizes", () => {
  assert.deepEqual(settings_drawer_layout(1000, 0.6), {
    position: 0.6,
    width: 400,
  });
  assert.deepEqual(settings_drawer_layout(600, 0.6), {
    position: 0.6,
    width: 240,
  });
});

test("restored out-of-range and invalid values produce bounded geometry", () => {
  assert.equal(settings_drawer_layout(1000, 0).width, 500);
  assert.equal(settings_drawer_layout(1000, 1).width, 50);
  assert.equal(settings_drawer_layout(1000, NaN).width, 300);
  assert.equal(settings_drawer_layout(1000, -1).width, 300);
  assert.equal(settings_drawer_layout(0, 0.6).width, 0);
});
