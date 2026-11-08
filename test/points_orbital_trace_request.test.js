import assert from "node:assert/strict";
import test from "node:test";
import { build_orbital_trace_request } from "../src/pages/study/points/PointsOrbitalTraceRequest.js";

const focal_point = { x: "0.12345678901234567890123456789", y: "-0.2" };
const point = (point_index, ratios = []) => ({
  point_index,
  point: { re: "-0.98765432109876543210987654321", im: "0.25" },
  landing_ratios: ratios.map(([numerator, denominator]) => ({ numerator, denominator })),
});
const orbital = (points) => ({ orbital_id: "42", period: points.length, points });

test("requests retain the selected parameter, exact targets, and every known landing ratio", () => {
  const input = orbital([point(0, [["1", "7"], ["2", "7"]]), point(1, [["4", "7"]])]);
  Object.assign(input.points[0].landing_ratios[0], {
    family_key: "period-3", angle_period: 3, validation_status: "validated",
  });
  const before = JSON.stringify(input);
  const result = build_orbital_trace_request(focal_point, input);
  assert.equal(result.orbital_id, "42");
  assert.equal(result.period, 2);
  assert.deepEqual(result.focal_point, focal_point);
  assert.deepEqual(result.requests.map((r) => [r.point_index, r.angle.key]), [
    [0, "1/7"], [0, "2/7"], [1, "4/7"],
  ]);
  assert.deepEqual(result.requests[0].landing_point, input.points[0].point);
  assert.equal(result.requests[0].family_key, "period-3");
  assert.equal(result.requests[0].angle_period, 3);
  assert.equal(result.requests[0].validation_status, "validated");
  assert.deepEqual(result.rejected, []);
  assert.equal(JSON.stringify(input), before);
  assert.doesNotThrow(() => JSON.stringify(result), "request can be sent to a worker");
});

test("angle normalization stays exact above Number precision and deduplicates equivalent accesses", () => {
  const result = build_orbital_trace_request(focal_point, orbital([
    point(0, [["1", "7"], ["2", "14"], ["9007199254740993", "18014398509481987"]]),
  ]));
  assert.equal(result.requests.length, 2);
  assert.equal(result.requests[1].angle.numerator, "9007199254740993");
  assert.equal(result.requests[1].angle.denominator, "18014398509481987");
});

test("no selection and orbitals with no landing ratios produce no trace work", () => {
  assert.equal(build_orbital_trace_request(focal_point, null), null);
  const result = build_orbital_trace_request(focal_point, orbital([point(0)]));
  assert.deepEqual(result.requests, []);
  assert.deepEqual(result.rejected, []);
});

test("malformed ratios and landing targets cannot become trace requests", () => {
  const input = orbital([
    point(0, [["1", "0"], ["1.5", "7"], [9007199254740992, "7"], ["2", "7"]]),
    { ...point(1, [["4", "7"]]), point: { re: "", im: "0" } },
  ]);
  const result = build_orbital_trace_request(focal_point, input);
  assert.deepEqual(result.requests.map((r) => r.angle.key), ["2/7"]);
  assert.equal(result.rejected.length, 4);
  assert.equal(build_orbital_trace_request({ x: null, y: 0 }, input), null);
  assert.equal(build_orbital_trace_request(focal_point, { ...input, period: 0 }), null);
});

test("switching orbitals builds a fresh request without retaining the previous ratios", () => {
  const first = build_orbital_trace_request(focal_point, orbital([point(0, [["1", "7"]])]));
  const second = build_orbital_trace_request(focal_point, {
    ...orbital([point(0, [["1", "3"]])]), orbital_id: "43",
  });
  assert.equal(second.orbital_id, "43");
  assert.deepEqual(second.requests.map((r) => r.angle.key), ["1/3"]);
  assert.equal(first.requests[0].angle.key, "1/7");
});
