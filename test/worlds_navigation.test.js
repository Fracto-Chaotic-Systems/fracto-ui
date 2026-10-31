import test from "node:test";
import assert from "node:assert/strict";
import {
  scroll_world_row,
  scroll_world_theme,
} from "../src/pages/games/WorldsNavigation.js";
test("world links scroll the requested row beneath the sticky header", () => {
  let result;
  const viewport = {
    scrollTop: 100,
    querySelector: (selector) =>
      selector === '[data-cardinality="28891"]'
        ? { getBoundingClientRect: () => ({ top: 500 }) }
        : selector === "thead"
          ? { getBoundingClientRect: () => ({ height: 30 }) }
          : null,
    getBoundingClientRect: () => ({ top: 50 }),
    scrollTo: (options) => {
      result = options;
    },
  };
  scroll_world_row(viewport, "28891");
  assert.deepEqual(result, { top: 519, behavior: "smooth" });
  result = null;
  scroll_world_row(viewport, "missing");
  scroll_world_row(viewport, 0);
  scroll_world_row(viewport, 999);
  scroll_world_row(null, 1);
  assert.equal(result, null);
});

test("world links independently reveal the matching theme without scrolling the page", () => {
  let result;
  const viewport = {
    scrollTop: 40,
    querySelector: (selector) =>
      selector === '[data-synset-id="00002137"]'
        ? { getBoundingClientRect: () => ({ top: 900 }) }
        : null,
    getBoundingClientRect: () => ({ top: 200 }),
    scrollTo: (options) => {
      result = options;
    },
  };
  scroll_world_theme(viewport, "00002137");
  assert.deepEqual(result, { top: 740, behavior: "smooth" });
  result = null;
  scroll_world_theme(viewport, "invalid");
  scroll_world_theme(viewport, "99999999");
  scroll_world_theme(null, "00002137");
  assert.equal(result, null);
});
