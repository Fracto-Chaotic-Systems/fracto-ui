import assert from "node:assert/strict";
import test from "node:test";

import {
  add_confidence_to_distribution,
  build_confidence_distribution,
  confidence_lightness_from_distribution,
  create_confidence_distribution,
} from "../src/pages/assets/SeedSurveyConfidenceScale.js";

test("maps the bottom and top one percent to the lightness endpoints", () => {
  const distribution = build_confidence_distribution(
    Array.from({ length: 100 }, (_, index) => index / 100),
  );

  assert.equal(confidence_lightness_from_distribution(0, distribution), 18);
  assert.equal(confidence_lightness_from_distribution(0.99, distribution), 88);
});

test("maps equal-population confidence ranks across the interior lightness span", () => {
  const distribution = build_confidence_distribution(
    Array.from({ length: 100 }, (_, index) => index / 100),
  );

  assert.equal(confidence_lightness_from_distribution(0.5, distribution), 53);
  assert.ok(
    confidence_lightness_from_distribution(0.75, distribution) >
      confidence_lightness_from_distribution(0.25, distribution),
  );
});

test("identical confidences receive identical lightness and invalid values are ignored", () => {
  const distribution = build_confidence_distribution([0.4, 0.4, 0.4, -1, NaN]);

  assert.equal(distribution.count, 3);
  assert.equal(
    confidence_lightness_from_distribution(0.4, distribution),
    confidence_lightness_from_distribution(0.4, distribution),
  );
  assert.equal(confidence_lightness_from_distribution(-1, distribution), null);
  assert.equal(confidence_lightness_from_distribution(NaN, distribution), null);
});

test("incremental updates produce the same distribution as a batch build", () => {
  const values = [0.12, 0.2, 0.2, 0.5, 0.78, 0.91];
  const incremental = create_confidence_distribution();
  values.forEach((value) => add_confidence_to_distribution(incremental, value));
  const complete = build_confidence_distribution(values);

  for (const value of values) {
    assert.equal(
      confidence_lightness_from_distribution(value, incremental),
      confidence_lightness_from_distribution(value, complete),
    );
  }
});
