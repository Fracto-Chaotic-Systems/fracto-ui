import assert from "node:assert/strict";
import test from "node:test";

import {
  add_escape_iteration,
  build_escape_distribution,
  create_escape_distribution,
  escape_lightness_from_distribution,
} from "../src/pages/assets/SeedSurveyEscapeScale.js";

test("maps the lowest and highest one percent of escape iterations to opposite grey endpoints", () => {
  const distribution = build_escape_distribution(
    Array.from({ length: 100 }, (_, index) => index + 1),
  );

  assert.equal(escape_lightness_from_distribution(1, distribution), 88);
  assert.equal(escape_lightness_from_distribution(100, distribution), 18);
});

test("maps intervening escape iterations by percentile rank", () => {
  const distribution = build_escape_distribution(
    Array.from({ length: 100 }, (_, index) => index + 1),
  );

  assert.equal(escape_lightness_from_distribution(50, distribution), 53);
  assert.ok(
    escape_lightness_from_distribution(25, distribution) >
      escape_lightness_from_distribution(75, distribution),
  );
});

test("includes zero-iteration escapes, ignores invalid values, and keeps ties at one shade", () => {
  const distribution = build_escape_distribution([0, 8, 8, 8, -1, NaN]);

  assert.equal(distribution.count, 4);
  assert.equal(
    escape_lightness_from_distribution(8, distribution),
    escape_lightness_from_distribution(8, distribution),
  );
  assert.ok(
    escape_lightness_from_distribution(0, distribution) >
      escape_lightness_from_distribution(8, distribution),
  );
  assert.equal(escape_lightness_from_distribution(-1, distribution), null);
});

test("incremental escape samples match a batch distribution", () => {
  const iterations = [1, 12, 50, 80, 120];
  const incremental = create_escape_distribution();
  iterations.forEach((value) => add_escape_iteration(incremental, value));
  const complete = build_escape_distribution(iterations);

  iterations.forEach((value) => {
    assert.equal(
      escape_lightness_from_distribution(value, incremental),
      escape_lightness_from_distribution(value, complete),
    );
  });
});
