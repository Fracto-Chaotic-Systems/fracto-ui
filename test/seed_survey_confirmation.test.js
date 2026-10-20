import test from "node:test";
import assert from "node:assert/strict";
import { orbital_confirmation, orbital_closure_error, ORBIT_CLOSURE_TOLERANCE } from "../src/pages/assets/surveys/SeedSurveyOrbitConfirmation.js";

test("cyclic sums include the last-to-first pair and complex multiplication", () => {
  const result = orbital_confirmation([{x: 1, y: 0}, {x: 0, y: 1}, {x: 0, y: 0}], 1);
  assert.deepEqual(result, { re: -1, im: 1, length: Math.SQRT2, length_error: Math.SQRT2 - 1, confidence: 2 - Math.SQRT2 });
});

test("unit product and magnitude threshold", () => {
  const points = [{x: 0.5, y: 0}, {x: 0.5, y: 0}, {x: 0.5, y: 0}];
  assert.equal(orbital_confirmation(points, 0.25), null);
  assert.equal(orbital_confirmation(points, null), null);
  assert.equal(orbital_confirmation([], 1), null);
  assert.equal(orbital_confirmation(points, 0.251).length_error, 0);
});

test("confidence compares product length rather than angle and clamps at zero", () => {
  assert.equal(orbital_confirmation([{x: 0, y: 0.5}], 1).confidence, 1);
  assert.equal(orbital_confirmation([{x: 2, y: 0}], 2).confidence, 0);
  assert.equal(orbital_confirmation([{x: NaN, y: 0}], 1), null);
});

test("closure checks every transition, including wraparound, independently of confidence", () => {
  assert.equal(orbital_closure_error([{x:0,y:0},{x:-1,y:0}],{x:-1,y:0}),0);
  assert.equal(orbital_closure_error([{x:0.5,y:0}],{x:0.25,y:0}),0);
  assert.equal(orbital_closure_error([],{x:0,y:0}),null);
  assert.equal(orbital_closure_error([{x:NaN,y:0}],{x:0,y:0}),null);
  assert.equal(orbital_closure_error([{x:0,y:0}],null),null);
  assert.equal(orbital_closure_error([{x:0,y:0}],{x:ORBIT_CLOSURE_TOLERANCE,y:0}),ORBIT_CLOSURE_TOLERANCE);
  const points=[{x:0,y:0},{x:1,y:0},{x:2,y:0}];
  assert.equal(orbital_closure_error(points,{x:1,y:0}),5);
  assert.equal(orbital_closure_error([{x:0,y:0},{x:2,y:0},{x:1,y:0}],{x:0,y:0}),3,"an internal transition can be worse than wraparound");
});
