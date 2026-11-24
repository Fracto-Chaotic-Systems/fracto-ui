import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import * as THREE from "three";
import { create_component_document } from "@fracto/sdk/FractoComponentDocument.js";
import { empty_material_construction } from "@fracto/sdk/FractoMaterialMetadata.js";
import { component_reference_key } from "@fracto/sdk/FractoComponentTools.js";
import { oriented_component_instance } from "../src/pages/games/ComponentStageGeometry.js";
import { create_component_content } from "../src/pages/games/ComponentStageContent.js";
const asset = { id: "tree", revision: "a".repeat(64) };
const facts = {
  ...empty_material_construction(),
  kind: "model",
  placement: "ground",
  meters_per_unit: 0.01,
  dimensions_m: [1, 2, 1],
  ground_anchor_m: [1, 2, 3],
  up_axis: "x",
  forward_axis: "-z",
  footprint_m: [1, 1],
};
const descriptor = {
  material: { ...asset, construction: facts },
  runtime: {
    id: "tree",
    model: "tree.glb",
    format: "glb",
    resources: ["tree.glb"],
  },
};
const tree_document = () => {
  const d = create_component_document(randomUUID(), "Tree");
  d.objects.push({
    id: randomUUID(),
    asset,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    group_id: null,
  });
  return d;
};
test("source-unit anchor maps to the target and authored axes map to stage Y/Z", () => {
  const prototype = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial(),
  );
  const placed = oriented_component_instance(
    prototype,
    facts,
    { position: [4, 5, 6], rotation: [0, 0, 0], scale: [1, 1, 1] },
    "tree",
  );
  placed.updateMatrixWorld(true);
  const clone = placed.children[0].children[0].children[0].children[0];
  const anchor = clone.localToWorld(new THREE.Vector3(100, 200, 300));
  assert.ok(anchor.distanceTo(new THREE.Vector3(4, 5, 6)) < 1e-10);
  assert.ok(
    clone
      .localToWorld(new THREE.Vector3(200, 200, 300))
      .sub(anchor)
      .distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-10,
  );
  assert.ok(
    clone
      .localToWorld(new THREE.Vector3(100, 200, 200))
      .sub(anchor)
      .distanceTo(new THREE.Vector3(0, 0, 1)) < 1e-10,
  );
  assert.deepEqual(prototype.scale.toArray(), [1, 1, 1]);
  prototype.geometry.dispose();
  prototype.material.dispose();
});
test("content shares resources, ignores name edits, updates transforms and disposes", async () => {
  const scene = new THREE.Scene(),
    statuses = [];
  let loads = 0,
    disposed = 0;
  const source = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshStandardMaterial(),
  );
  source.geometry.addEventListener("dispose", () => disposed++);
  const content = create_component_content({
    scene,
    render() {},
    on_status: (value) => statuses.push(value),
    resolve: async () => ({ [component_reference_key(asset)]: descriptor }),
    load: async () => {
      loads++;
      return source;
    },
  });
  const document = tree_document();
  await content.update(document);
  assert.equal(content.root.children.length, 1);
  assert.equal(loads, 1);
  await content.update({ ...document, name: "Rename" });
  assert.equal(loads, 1);
  document.objects[0].position = [5, 0, 0];
  await content.update(document);
  assert.equal(content.root.children[0].position.x, 5);
  assert.equal(loads, 1);
  assert.equal(statuses.at(-1), "content_ready");
  content.dispose();
  await Promise.resolve();
  assert.equal(disposed, 1);
  assert.equal(scene.children.length, 0);
});
test("late loads never attach after disposal", async () => {
  let resolve_load,
    disposed = 0;
  const source = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshStandardMaterial(),
  );
  source.geometry.addEventListener("dispose", () => disposed++);
  const scene = new THREE.Scene();
  const content = create_component_content({
    scene,
    render() {},
    on_status() {},
    resolve: async () => ({ [component_reference_key(asset)]: descriptor }),
    load: () =>
      new Promise((resolve) => {
        resolve_load = resolve;
      }),
  });
  const pending = content.update(tree_document());
  await Promise.resolve();
  content.dispose();
  resolve_load(source);
  await pending;
  assert.equal(scene.children.length, 0);
  assert.equal(disposed, 1);
});

test("saved component speed drives clips and speed-only edits update playback", async () => {
  const source = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshStandardMaterial(),
  );
  source.animations = [
    new THREE.AnimationClip("Wind", 2, [
      new THREE.VectorKeyframeTrack(".position", [0, 2], [0, 0, 0, 2, 0, 0]),
    ]),
  ];
  const content = create_component_content({
    scene: new THREE.Scene(),
    render() {},
    on_status() {},
    resolve: async () => ({ [component_reference_key(asset)]: descriptor }),
    load: async () => source,
  });
  const document = { ...tree_document(), animation_speed: 0.25 };
  await content.update(document);
  content.animate(1);
  assert.equal(
    content.root.getObjectByProperty("isMesh", true).position.x,
    0.25,
  );
  await content.update({ ...document, animation_speed: 0.5 });
  content.animate(1);
  assert.equal(
    content.root.getObjectByProperty("isMesh", true).position.x,
    0.5,
  );
  await content.update({ ...document, animation_speed: 0 });
  assert.equal(content.animated, false);
  content.animate(1);
  assert.equal(content.root.getObjectByProperty("isMesh", true).position.x, 0);
  await content.update(tree_document());
  content.animate(1);
  assert.equal(content.root.getObjectByProperty("isMesh", true).position.x, 1);
  content.dispose();
});

test("a stale failed load cannot evict a newer cache entry for the same material", async () => {
  const scene = new THREE.Scene(),
    pending = [],
    statuses = [];
  const content = create_component_content({
    scene,
    render() {},
    on_status: (value) => statuses.push(value),
    resolve: async (refs) =>
      refs.some(Boolean)
        ? { [component_reference_key(asset)]: descriptor }
        : {},
    load: (runtime, ready, on_error) =>
      new Promise((resolve, reject) =>
        pending.push({ resolve, reject, on_error }),
      ),
  });
  const document = tree_document();
  const first = content.update(document);
  await Promise.resolve();
  await content.update(create_component_document(randomUUID(), "Empty"));
  const second = content.update(document);
  await Promise.resolve();
  assert.equal(pending.length, 2);
  pending[0].on_error();
  pending[0].reject(new Error("old network failure"));
  const source = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshStandardMaterial(),
  );
  pending[1].resolve(source);
  await Promise.all([first, second]);
  assert.equal(statuses.at(-1), "content_ready");
  document.objects[0].position = [2, 0, 0];
  await content.update(document);
  assert.equal(pending.length, 2);
  content.dispose();
});

test("authored patrols move the outer placement, face forwards, inherit speed and pause", async () => {
  const source = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshStandardMaterial(),
  );
  const content = create_component_content({
    scene: new THREE.Scene(),
    render() {},
    on_status() {},
    resolve: async () => ({ [component_reference_key(asset)]: descriptor }),
    load: async () => source,
  });
  const d = tree_document();
  d.animation_speed = 0.125;
  d.objects[0].motion = {
    algorithm: "facing-patrol-v1",
    speed_mps: 0.008,
    distance_m: 0.03,
  };
  const original = JSON.stringify(d);
  await content.update(d);
  assert.equal(content.animated, true);
  content.animate(1);
  assert.equal(content.root.children[0].position.z, 0.001);
  content.animate(30);
  assert.ok(Math.abs(content.root.children[0].position.z - 0.029) < 1e-12);
  assert.equal(content.root.children[0].rotation.y, Math.PI);
  assert.equal(JSON.stringify(d), original);
  await content.update({ ...d, animation_speed: 0 });
  assert.equal(content.animated, false);
  content.animate(10);
  assert.equal(content.root.children[0].position.z, 0);
  content.dispose();
  assert.equal(content.animated, false);
});
