import assert from "node:assert/strict";
import test from "node:test";

import {
  add_iteration_value,
  build_iteration_distribution,
  create_iteration_distribution,
  iteration_lightness_from_distribution,
} from "../src/pages/assets/SeedSurveyIterationScale.js";

test("maps low iteration percentiles lighter than high iteration percentiles", () => {
  const distribution = build_iteration_distribution(
    Array.from({ length: 100 }, (_, index) => index + 1),
  );

  assert.equal(iteration_lightness_from_distribution(1, distribution), 88);
  assert.equal(iteration_lightness_from_distribution(100, distribution), 18);
});

test("maps intervening iteration values by percentile rank", () => {
  const distribution = build_iteration_distribution(
    Array.from({ length: 100 }, (_, index) => index + 1),
  );

  assert.equal(iteration_lightness_from_distribution(50, distribution), 53);
  assert.ok(
    iteration_lightness_from_distribution(25, distribution) >
      iteration_lightness_from_distribution(75, distribution),
  );
});

test("preserves shading distinctions above the old 4096-iteration ceiling", () => {
  const distribution = build_iteration_distribution([
    ...Array.from({ length: 100 }, (_, index) => 5000 + index),
    ...Array.from({ length: 100 }, (_, index) => 9000 + index),
  ]);

  assert.equal(distribution.count, 200);
  assert.equal(iteration_lightness_from_distribution(5000, distribution), 88);
  assert.equal(iteration_lightness_from_distribution(9099, distribution), 18);
});

test("includes zero, ignores invalid values, and keeps ties at one shade", () => {
  const distribution = build_iteration_distribution([0, 8, 8, 8, -1, NaN]);

  assert.equal(distribution.count, 4);
  assert.ok(
    iteration_lightness_from_distribution(0, distribution) >
      iteration_lightness_from_distribution(8, distribution),
  );
  assert.equal(iteration_lightness_from_distribution(-1, distribution), null);
});

test("incremental samples match a batch distribution", () => {
  const iterations = [1, 12, 50, 80, 120];
  const incremental = create_iteration_distribution();
  iterations.forEach((value) => add_iteration_value(incremental, value));
  const complete = build_iteration_distribution(iterations);

  iterations.forEach((value) => {
    assert.equal(
      iteration_lightness_from_distribution(value, incremental),
      iteration_lightness_from_distribution(value, complete),
    );
  });
});
