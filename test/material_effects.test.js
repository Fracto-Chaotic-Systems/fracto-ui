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
    // The light rises vertically: 0.35 * size * mount scale straight up.
    const offset = effect.light
      .getWorldPosition(new THREE.Vector3())
      .sub(base);
    assert.ok(Math.abs(offset.x) < 1e-9 && Math.abs(offset.z) < 1e-9, `${degrees}`);
    assert.ok(Math.abs(offset.y - 30 * 0.35 * 0.5) < 1e-9, `${degrees} height`);
    effect.dispose();
  }
});
