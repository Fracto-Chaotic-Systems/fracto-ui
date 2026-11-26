import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { create_ordered_component_reveal } from "../src/pages/games/ComponentOrderedReveal.js";
import {
  grass_introduction_rank,
  GRASS_INTRODUCTION,
  GRASS_FULL_VISIBILITY_SECONDS,
} from "../src/pages/games/GamesPlayGrassIntroduction.js";

const mesh = () =>
  new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());

test("five material groups fade ahead of their music cues, with clock-driven fades and buffering", () => {
  const sequence = create_ordered_component_reveal(GRASS_INTRODUCTION);
  const roots = Array.from({ length: 5 }, mesh);
  const arrivals = roots.map((_, rank) => sequence.expect(rank, true));
  sequence.seal();
  assert.equal(sequence.prepared, false);
  for (const rank of [4, 3, 2, 1, 0]) arrivals[rank](roots[rank]);
  assert.equal(sequence.prepared, true);
  sequence.release(4);
  sequence.update(20, 3.999);
  assert.ok(
    roots.every((root) => !root.visible),
    "Preloading must leave the opening completely white",
  );
  sequence.update(0, 4);
  assert.equal(roots[0].visible, true);
  assert.equal(
    roots[0].customDepthMaterial,
    undefined,
    "Insects appear at the TV cue",
  );
  for (let rank = 1; rank < 5; rank++) {
    const cue = GRASS_INTRODUCTION.cue_seconds[rank];
    sequence.update(100, cue - 0.001);
    assert.equal(roots[rank].visible, false);
    sequence.update(0, cue);
    assert.equal(roots[rank].visible, true);
    const shader = {
      uniforms: {},
      fragmentShader: "#include <alphatest_fragment>",
    };
    roots[rank].material.onBeforeCompile(shader);
    sequence.update(100, cue);
    assert.equal(
      shader.uniforms.componentReveal.value,
      0,
      "Buffering pauses the fade",
    );
    sequence.update(0, cue + GRASS_INTRODUCTION.durations[rank] / 2);
    assert.ok(Math.abs(shader.uniforms.componentReveal.value - 0.5) < 1e-10);
    assert.ok(
      roots[rank].customDepthMaterial,
      "Shadows fade with the material",
    );
  }
  sequence.update(0, 26.5);
  assert.ok(roots.every((root) => !root.customDepthMaterial));
  assert.equal(sequence.complete, true);
  sequence.dispose();
});

test("a delayed early download cannot shift later audio cues, and late frames catch up", () => {
  const sequence = create_ordered_component_reveal(GRASS_INTRODUCTION);
  const roots = Array.from({ length: 5 }, mesh);
  const arrivals = roots.map((_, rank) => sequence.expect(rank, true));
  sequence.seal();
  sequence.release(4);
  for (const rank of [4, 3, 2, 0]) arrivals[rank](roots[rank]);
  sequence.update(0, 22);
  assert.equal(roots[2].visible, true);
  assert.equal(roots[2].customDepthMaterial, undefined);
  assert.equal(roots[3].visible, true);
  assert.equal(roots[4].visible, false);
  arrivals[1](roots[1]);
  sequence.update(0, 29.5);
  assert.ok(roots.every((root) => root.visible && !root.customDepthMaterial));
  assert.equal(sequence.complete, true);
  sequence.dispose();
});

test("materials reach full coverage exactly at the requested beats, preserving sudden insects", () => {
  assert.deepEqual(GRASS_FULL_VISIBILITY_SECONDS, [4, 10.25, 17.5, 23.5, 26.5]);
  assert.deepEqual(GRASS_INTRODUCTION.cue_seconds, [4, 8.75, 13.5, 20.5, 23.5]);
  for (let rank = 0; rank < 5; rank++) {
    const sequence = create_ordered_component_reveal(GRASS_INTRODUCTION);
    const root = mesh(),
      original = root.material;
    sequence.expect(rank, true)(root);
    sequence.seal();
    sequence.release(4);
    const end = GRASS_FULL_VISIBILITY_SECONDS[rank];
    sequence.update(0, end - 0.001);
    if (rank === 0) assert.equal(root.visible, false);
    else {
      assert.equal(root.visible, true);
      assert.notEqual(root.material, original);
      assert.ok(root.customDepthMaterial);
    }
    sequence.update(0, end);
    assert.equal(root.visible, true);
    assert.equal(
      root.material,
      original,
      "Full original material coverage at the cue",
    );
    assert.equal(root.customDepthMaterial, undefined);
    sequence.dispose();
  }
});

test("cached later materials stay hidden until each earlier category finishes, including missing downloads", () => {
  const sequence = create_ordered_component_reveal();
  const roots = Array.from({ length: 4 }, mesh);
  const arrivals = roots.map((_, rank) => sequence.expect(rank, true));
  sequence.seal();
  // Dirt, grass and rocks download before the insect. None may appear early.
  for (const rank of [2, 3, 1]) arrivals[rank](roots[rank]);
  sequence.update(20);
  assert.deepEqual(
    roots.slice(1).map((root) => root.visible),
    [false, false, false],
  );
  arrivals[0](roots[0]);
  for (let rank = 0; rank < 4; rank++) {
    sequence.update(0.6);
    assert.equal(roots[rank].visible, true);
    assert.ok(
      roots[rank].customDepthMaterial,
      "Shadows use the same gradual fade",
    );
    assert.ok(roots.slice(rank + 1).every((root) => !root.visible));
    sequence.update(0.6);
    assert.equal(roots[rank].customDepthMaterial, undefined);
  }
  assert.equal(sequence.complete, true);
  assert.equal(sequence.active, false);
  const late = mesh();
  sequence.expect(0, false)(late);
  assert.equal(late.visible, false);
  sequence.update(1.2);
  assert.equal(late.visible, true);
  sequence.dispose();
});

test("empty categories are skipped and cancellation restores temporary materials", () => {
  const sequence = create_ordered_component_reveal();
  const grass = mesh(),
    original = grass.material;
  sequence.expect(3, true)(grass);
  sequence.seal();
  sequence.update(0.1);
  sequence.update(0.1);
  assert.equal(grass.visible, true);
  assert.notEqual(grass.material, original);
  sequence.dispose();
  assert.equal(grass.material, original);
});

test("published strip roles distinguish small sparse tufts from large dense tufts", () => {
  assert.equal(grass_introduction_rank({ floor: {}, objects: [] }), 2);
  for (const [id, rank] of [
    ["ladybug-with-animated-walk-cycle-only", 0],
    ["rocks-piece-084", 1],
    ["animated-grass", 3],
    ["yard-grass", 4],
  ])
    assert.equal(
      grass_introduction_rank({ objects: [{ asset: { id } }] }),
      rank,
    );
});
