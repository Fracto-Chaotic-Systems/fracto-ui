import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { FIRE_PALETTES } from "@fracto/sdk/FractoMaterialEffects.js";
import { create_fire_effect } from "../src/pages/games/effects/FireEffect.js";
import { create_material_effects } from "../src/pages/games/effects/MaterialEffects.js";

const fire = (extra = {}) => ({
  type: "fire",
  anchor: [1, 90, -3],
  size: 30,
  width: null,
  cardinality: 1,
  intensity: 1,
  speed: 1,
  light: true,
  sparks: true,
  shadows: true,
  light_offset: null,
  ...extra,
});
const hex = (color) => `#${color.getHexString()}`;
const expected = (value) => hex(new THREE.Color(value));

test("fire sits on its anchor with flame layers, glow, sparks and a light", () => {
  const effect = create_fire_effect(fire());
  const { object } = effect;
  assert.deepEqual(object.position.toArray(), [1, 90, -3]);
  const meshes = object.children.filter((child) => child.isMesh);
  assert.equal(meshes.length, 4);
  assert.equal(object.children.filter((child) => child.isPoints).length, 1);
  assert.ok(effect.light?.isPointLight);
  object.traverse((node) => assert.equal(node.userData.inventory_effect, true));
  for (const mesh of meshes) {
    assert.equal(mesh.material.depthWrite, false);
    assert.equal(mesh.frustumCulled, false);
  }
  effect.dispose();
  assert.equal(object.parent, null);
});

test("light and sparks can be turned off", () => {
  const effect = create_fire_effect(fire({ light: false, sparks: false }));
  assert.equal(effect.light, null);
  assert.equal(
    effect.object.children.some((child) => child.isPoints),
    false,
  );
});

test("time advances with speed and the light flickers around its base", () => {
  const effect = create_fire_effect(fire({ speed: 2 }));
  const start = effect.time;
  const levels = [];
  for (let i = 0; i < 60; i++) {
    effect.update(1 / 30);
    levels.push(effect.light.intensity);
  }
  assert.ok(Math.abs(effect.time - start - 4) < 1e-9);
  assert.ok(Math.max(...levels) > Math.min(...levels));
  assert.ok(Math.min(...levels) > 0);
});

test("the cardinality's pattern color drives every layer, the sparks and the light", () => {
  const effect = create_fire_effect(fire({ cardinality: 3 }));
  const flame = effect.object.children.find((child) => child.isMesh).material;
  const spark = effect.object.children.find((child) => child.isPoints).material;
  assert.equal(hex(flame.uniforms.uBody.value), expected(FIRE_PALETTES[3].body));
  assert.equal(spark.uniforms.uCore.value, flame.uniforms.uCore.value);
  effect.set_cardinality(9);
  assert.equal(hex(flame.uniforms.uTip.value), expected(FIRE_PALETTES[9].tip));
  assert.notEqual(hex(effect.light.color), "ffffff");
  effect.set_cardinality(null);
  assert.equal(hex(flame.uniforms.uBody.value), expected(FIRE_PALETTES[3].body));
  assert.throws(() => effect.set_cardinality(2));
});

test("material effects attach every valid effect and ignore invalid lists", () => {
  const effects = create_material_effects([
    fire(),
    fire({ anchor: [0, 0, 0], cardinality: 15 }),
  ]);
  assert.equal(effects.count, 2);
  assert.equal(effects.object.children.length, 2);
  effects.set_cardinality(7);
  effects.update(0.1);
  effects.dispose();
  assert.equal(create_material_effects(undefined).count, 0);
  assert.equal(create_material_effects([{ type: "smoke" }]).count, 0);
  assert.equal(
    create_material_effects([fire({ cardinality: 4 })]).count,
    0,
  );
});

test("a fire on a tilted mount keeps its anchor but lights from straight above it", () => {
  for (const degrees of [-30, 0, 30]) {
    const mount = new THREE.Group();
    mount.rotation.z = THREE.MathUtils.degToRad(degrees);
    mount.scale.setScalar(0.5);
    const effect = create_fire_effect(fire({ anchor: [0, 90, 0] }));
    mount.add(effect.object);
    effect.update(0.016);
    mount.updateMatrixWorld(true);
    const base = effect.object.getWorldPosition(new THREE.Vector3());
    // The anchor follows the tilt (90 * 0.5 along the rotated axis).
    const expected_base = new THREE.Vector3(0, 45, 0).applyAxisAngle(
      new THREE.Vector3(0, 0, 1),
      THREE.MathUtils.degToRad(degrees),
    );
    assert.ok(base.distanceTo(expected_base) < 1e-9, `${degrees} base`);
    // The light stays above the flame along world up (0.35 x size x mount scale),
    // drifting at most 6% of the size sideways and 4% up/down or in depth.
    const offset = effect.light
      .getWorldPosition(new THREE.Vector3())
      .sub(base)
      .divideScalar(30 * 0.5);
    assert.ok(Math.abs(offset.x) <= 0.06 + 1e-9, `${degrees} x`);
    assert.ok(Math.abs(offset.z) <= 0.04 + 1e-9, `${degrees} z`);
    assert.ok(Math.abs(offset.y - 0.35) <= 0.04 + 1e-9, `${degrees} height`);
    effect.dispose();
  }
});

test("light range and brightness follow the fire's world size", () => {
  const native = create_fire_effect(fire());
  native.update(0);
  const mount = new THREE.Group();
  mount.scale.setScalar(0.01);
  const scaled = create_fire_effect(fire());
  mount.add(scaled.object);
  scaled.update(0);
  assert.ok(Math.abs(native.light.distance - 30 * 8) < 1e-9);
  assert.ok(Math.abs(scaled.light.distance - 30 * 0.01 * 8) < 1e-9);
  // Brightness scales with world size squared; each fire flickers on its own
  // schedule, so compare against the size term (flicker stays within 0.56–1).
  const scaled_base = 6 * (30 * 0.01) ** 2;
  assert.ok(scaled.light.intensity / scaled_base > 0.5);
  assert.ok(scaled.light.intensity / scaled_base <= 1.01);
});

test("the fire light casts shadows from a drifting position unless shadows is false", () => {
  const mount = new THREE.Group();
  mount.scale.setScalar(0.01);
  mount.rotation.z = 0.4;
  const effect = create_fire_effect(fire());
  mount.add(effect.object);
  assert.equal(effect.light.castShadow, true);
  const positions = [];
  for (let i = 0; i < 40; i++) {
    effect.update(1 / 20);
    positions.push(effect.light.getWorldPosition(new THREE.Vector3()));
    // Shadow camera range follows the world-scaled light reach.
    assert.ok(Math.abs(effect.light.shadow.camera.far - effect.light.distance) < 1e-12);
    assert.ok(effect.light.shadow.camera.near > 0);
  }
  const spread = Math.max(...positions.map((p) => p.distanceTo(positions[0])));
  assert.ok(spread > 0.005 && spread < 0.05, `spread ${spread}`);
  assert.equal(create_fire_effect(fire({ shadows: false })).light.castShadow, false);
  // Older records without the field keep shadows on.
  const legacy = fire();
  delete legacy.shadows;
  assert.equal(create_fire_effect(legacy).light.castShadow, true);
});

test("light_offset moves the light along the model's own x/z and raises it along world up", () => {
  const mount = new THREE.Group();
  mount.rotation.z = 0.5; // tilted model
  const effect = create_fire_effect(
    fire({ anchor: [0, 0, 0], speed: 0, light_offset: [0, 30, -35] }),
  );
  mount.add(effect.object);
  effect.update(0);
  mount.updateMatrixWorld(true);
  const base = effect.object.getWorldPosition(new THREE.Vector3());
  const light = effect.light.getWorldPosition(new THREE.Vector3()).sub(base);
  // −35 on the model's z (unchanged by a tilt about z), 30 up along world y,
  // plus at most the bounded drift (6% / 4% of the size, 30).
  assert.ok(Math.abs(light.z - -35) <= 0.04 * 30 + 1e-9, `z ${light.z}`);
  assert.ok(Math.abs(light.y - 30) <= 0.04 * 30 + 1e-9, `y ${light.y}`);
  assert.ok(Math.abs(light.x) <= 0.06 * 30 + 1e-9, `x ${light.x}`);
});

test("the shadow camera projection uses the world-scaled near and far planes", () => {
  const mount = new THREE.Group();
  mount.scale.setScalar(0.01);
  const effect = create_fire_effect(fire({ size: 100 }));
  mount.add(effect.object);
  effect.update(0.016);
  const camera = effect.light.shadow.camera;
  const m = camera.projectionMatrix.elements;
  // For a perspective projection, near = m14 / (m10 - 1) and far = m14 / (m10 + 1).
  assert.ok(Math.abs(m[14] / (m[10] - 1) - camera.near) < 1e-9);
  assert.ok(Math.abs(m[14] / (m[10] + 1) - camera.far) < 1e-6);
  assert.ok(Math.abs(camera.near - 100 * 0.01 * 0.02) < 1e-12);
});

test("fires placed in different spots move on their own schedules; the same spot repeats", () => {
  const place = (x) => {
    const mount = new THREE.Group();
    mount.position.set(x, 3, 0);
    mount.scale.setScalar(0.01);
    const effect = create_fire_effect(fire());
    mount.add(effect.object);
    return effect;
  };
  const run = (effect) => {
    const trace = [];
    for (let i = 0; i < 90; i++) {
      effect.update(1 / 30);
      trace.push(effect.light.position.clone());
    }
    return trace;
  };
  const a = place(-4.6),
    b = place(4.6),
    again = place(-4.6);
  const trace_a = run(a),
    trace_b = run(b),
    trace_again = run(again);
  assert.notEqual(a.identity.seed, b.identity.seed);
  assert.deepEqual(a.identity, again.identity);
  assert.ok(trace_a.every((p, i) => p.distanceTo(trace_again[i]) < 1e-12));
  // Different fires are out of step: their drifts differ through the run.
  const differing = trace_a.filter((p, i) => p.distanceTo(trace_b[i]) > 1e-4).length;
  assert.ok(differing > 80, `differing ${differing}`);
  // Tempo wanders but stays near real time (0.7–1.3×).
  for (const effect of [a, b]) {
    const start = effect.time;
    effect.update(1);
    const step = effect.time - start;
    assert.ok(step > 0.65 && step < 1.35, `step ${step}`);
  }
  // Flame noise differs too.
  const seed = (effect) =>
    effect.object.children.find((child) => child.isMesh && child.material.uniforms.uSeed)
      .material.uniforms.uSeed.value;
  assert.notEqual(seed(a), seed(b));
});
