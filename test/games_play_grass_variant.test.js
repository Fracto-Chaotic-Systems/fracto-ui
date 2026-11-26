import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { create_component_document } from "@fracto/sdk/FractoComponentDocument.js";
import { sample_component_motion } from "@fracto/sdk/FractoComponentMotion.js";
import * as THREE from "three";
import { create_component_animation } from "../src/pages/games/ComponentStageAnimation.js";
import {
  PLAY_GRASS_VARIANT,
  play_grass_variant_document,
} from "../src/pages/games/GamesPlayGrassVariant.js";
import { PLAY_GRASS_RELEASE } from "../src/pages/games/GamesPlayGrassRelease.js";

function base_document() {
  const doc = create_component_document(
    PLAY_GRASS_VARIANT.base.component_id,
    "Grass strip",
  );
  doc.animation_speed = 0.125;
  doc.groups = [
    { id: PLAY_GRASS_VARIANT.role_groups.walking_insects, name: "Ladybugs" },
  ];
  doc.objects = Array.from({ length: 21 }, (_, i) => ({
    id: randomUUID(),
    group_id: i < 20 ? doc.groups[0].id : null,
    asset: { id: i < 20 ? "ladybug" : "grass", revision: "a".repeat(64) },
    position: [0, 0, i * 0.1],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    ...(i < 20
      ? {
          motion: {
            algorithm: "facing-patrol-v1",
            distance_m: 0.2,
            speed_mps: 0.006,
          },
        }
      : { animation_speed: 1 }),
  }));
  return doc;
}

test("playback selects saved zoomies delta and changes exactly insect movement and matching walk clocks", () => {
  const base = base_document(),
    snapshot = structuredClone(base);
  const variant = play_grass_variant_document(
    base,
    17,
    PLAY_GRASS_RELEASE.variant,
  );
  assert.equal(PLAY_GRASS_RELEASE.variant, "ladybug-zoomies");
  assert.deepEqual(base, snapshot, "Published base is never mutated");
  assert.equal(variant.objects.length, 21);
  for (let i = 0; i < 20; i++) {
    assert.equal(
      variant.objects[i].motion.speed_mps,
      base.objects[i].motion.speed_mps * 8,
    );
    assert.equal(variant.objects[i].animation_speed, 1);
    const expected = structuredClone(base.objects[i]);
    expected.motion.algorithm = "facing-wander-v1";
    expected.motion.speed_mps *= 8;
    expected.animation_speed = 1;
    assert.deepEqual(variant.objects[i], expected);
    const normal = sample_component_motion(
      {
        ...base.objects[i],
        motion: { ...base.objects[i].motion, algorithm: "facing-wander-v1" },
      },
      0.1 * base.animation_speed,
    );
    const fast = sample_component_motion(
      variant.objects[i],
      0.1 * variant.animation_speed,
    );
    assert.ok(
      Math.abs(
        fast.position[2] -
          base.objects[i].position[2] -
          8 * (normal.position[2] - base.objects[i].position[2]),
      ) < 1e-9,
    );
  }
  assert.deepEqual(variant.objects[20], base.objects[20]);
  assert.deepEqual({ ...variant, objects: [] }, { ...base, objects: [] });
  assert.throws(
    () => play_grass_variant_document(base, 18, PLAY_GRASS_RELEASE.variant),
    /invalid_component_variant/,
  );
});

test("resolved zoomies clip clocks animate eight times faster without speeding up grass", () => {
  const base = base_document();
  const variant = play_grass_variant_document(
    base,
    17,
    PLAY_GRASS_RELEASE.variant,
  );
  const source = new THREE.Group();
  source.animations = [
    new THREE.AnimationClip("Walk", 10, [
      new THREE.VectorKeyframeTrack(".position", [0, 10], [0, 0, 0, 10, 0, 0]),
    ]),
  ];
  const slow = source.clone(),
    fast = source.clone(),
    grass = source.clone();
  const animation = create_component_animation();
  animation.add(source, slow, 1, base.objects[0].animation_speed);
  animation.add(source, fast, 1, variant.objects[0].animation_speed);
  animation.add(source, grass, 1, variant.objects[20].animation_speed);
  animation.start(base.animation_speed);
  animation.update(1);
  assert.equal(fast.position.x, slow.position.x * 8);
  assert.equal(grass.position.x, 1);
  animation.dispose();
});
