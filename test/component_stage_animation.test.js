import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { create_component_animation } from "../src/pages/games/ComponentStageAnimation.js";
import { oriented_component_instance } from "../src/pages/games/ComponentStageGeometry.js";

test("809 repeated patches share looping morph playback without moving authored placement", () => {
  const source = new THREE.Group();
  const geometry = new THREE.BoxGeometry();
  geometry.morphAttributes.position = [geometry.attributes.position.clone()];
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  mesh.name = "Grass";
  mesh.morphTargetInfluences = [0];
  source.add(mesh);
  source.animations = [
    new THREE.AnimationClip("Wind", 1, [
      new THREE.NumberKeyframeTrack(
        "Grass.morphTargetInfluences[0]",
        [0, 1],
        [0, 1],
      ),
    ]),
  ];
  const animation = create_component_animation();
  const models = [];
  const facts = {
    up_axis: "y",
    forward_axis: "z",
    ground_anchor_m: [0, 0, 0],
    meters_per_unit: 0.05,
  };
  const patches = Array.from({ length: 809 }, (_, i) =>
    oriented_component_instance(
      source,
      facts,
      {
        position: [0, 0, i * 0.01],
        rotation: [0, ((i % 4) * Math.PI) / 2, 0],
        scale: [0.55, 0.55, 0.55],
      },
      String(i),
      (model) => {
        models.push(model);
        animation.add(source, model);
      },
    ),
  );
  const before = patches.map((p) => [
    p.position.toArray(),
    p.rotation.toArray(),
    p.scale.toArray(),
  ]);
  animation.start(0.25);
  animation.update(0.25);
  assert.ok(
    models.every(
      (m) => Math.abs(m.children[0].morphTargetInfluences[0] - 0.0625) < 1e-8,
    ),
  );
  animation.update(4);
  assert.ok(
    models.every(
      (m) => Math.abs(m.children[0].morphTargetInfluences[0] - 0.0625) < 1e-8,
    ),
  );
  assert.equal(source.children[0].morphTargetInfluences[0], 0);
  assert.deepEqual(
    patches.map((p) => [
      p.position.toArray(),
      p.rotation.toArray(),
      p.scale.toArray(),
    ]),
    before,
  );
  animation.dispose();
  assert.equal(animation.active, false);
  animation.update(0.2);
  mesh.geometry.dispose();
  mesh.material.dispose();
});

test("static stages need no animated frame loop", () => {
  const animation = create_component_animation();
  const source = new THREE.Group();
  animation.add(source, source.clone());
  animation.start();
  assert.equal(animation.active, false);
  animation.dispose();
});

test("variant clip clocks isolate rates even for clones sharing one source", () => {
  const source = new THREE.Group();
  source.animations = [
    new THREE.AnimationClip("Walk", 10, [
      new THREE.VectorKeyframeTrack(".position", [0, 10], [0, 0, 0, 10, 0, 0]),
    ]),
  ];
  const normal = source.clone(),
    fast = source.clone();
  const animation = create_component_animation();
  animation.add(source, normal);
  animation.add(source, fast, 8);
  animation.start(0.125);
  animation.update(1);
  assert.equal(normal.position.x, 0.125);
  assert.equal(fast.position.x, 1);
  assert.equal(source.position.x, 0);
  animation.dispose();
});

test("an explicit object clock runs at native speed independently of the component clock", () => {
  const source = new THREE.Group();
  source.animations = [
    new THREE.AnimationClip("Wind", 10, [
      new THREE.VectorKeyframeTrack(".position", [0, 10], [0, 0, 0, 10, 0, 0]),
    ]),
  ];
  for (const speed of [0.125, 0.5, 0]) {
    const inherited = source.clone(),
      independent = source.clone(),
      animation = create_component_animation();
    animation.add(source, inherited);
    animation.add(source, independent, 1, 1);
    animation.start(speed);
    animation.update(1);
    assert.equal(inherited.position.x, speed);
    assert.equal(independent.position.x, 1);
    assert.equal(animation.active, true);
    animation.dispose();
  }
});
