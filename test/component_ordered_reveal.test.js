import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { create_ordered_component_reveal } from "../src/pages/games/ComponentOrderedReveal.js";
import {
  grass_introduction_rank,
  GRASS_INTRODUCTION,
} from "../src/pages/games/GamesPlayGrassIntroduction.js";

const mesh = () =>
  new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());

test("TV cue releases only insects; CHAOS completion permits stones, then a sustained white-ground hold before slow dirt and grass", () => {
  const sequence = create_ordered_component_reveal(GRASS_INTRODUCTION);
  const roots = Array.from({ length: 4 }, mesh);
  const arrivals = roots.map((_, rank) => sequence.expect(rank, true));
  sequence.seal();
  assert.equal(sequence.prepared, false);
  for (const rank of [3, 2, 1, 0]) arrivals[rank](roots[rank]);
  assert.equal(sequence.prepared, true);
  sequence.update(20);
  assert.ok(
    roots.every((root) => !root.visible),
    "Preloading must leave the opening completely white",
  );
  sequence.release(0);
  sequence.update(0);
  assert.equal(roots[0].visible, true);
  assert.equal(
    roots[0].customDepthMaterial,
    undefined,
    "Insects appear at the TV cue",
  );
  sequence.update(8);
  assert.ok(
    roots.slice(1).every((root) => !root.visible),
    "No landscape while CHAOS is visible",
  );
  sequence.release(3);
  sequence.update(1.5);
  assert.equal(roots[1].visible, true);
  sequence.update(3.9);
  assert.equal(roots[2].visible, false);
  assert.equal(roots[3].visible, false);
  sequence.update(0.11);
  sequence.update(0.1);
  assert.equal(roots[2].visible, true);
  sequence.update(2);
  assert.ok(roots[2].customDepthMaterial, "Dirt fades slowly for four seconds");
  assert.equal(roots[3].visible, false);
  sequence.update(2);
  sequence.update(0.1);
  assert.equal(roots[3].visible, true);
  sequence.update(2);
  assert.ok(
    roots[3].customDepthMaterial,
    "Grass also fades slowly for four seconds",
  );
  sequence.update(2);
  assert.equal(sequence.complete, true);
  sequence.dispose();
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

test("published strip roles are ladybugs, unique rocks, dirt, then both grasses", () => {
  assert.equal(grass_introduction_rank({ floor: {}, objects: [] }), 2);
  for (const [id, rank] of [
    ["ladybug-with-animated-walk-cycle-only", 0],
    ["rocks-piece-084", 1],
    ["animated-grass", 3],
    ["yard-grass", 3],
  ])
    assert.equal(
      grass_introduction_rank({ objects: [{ asset: { id } }] }),
      rank,
    );
});
