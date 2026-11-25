import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setImmediate } from "node:timers";
import * as THREE from "three";
import { create_component_document } from "@fracto/sdk/FractoComponentDocument.js";
import { empty_material_construction } from "@fracto/sdk/FractoMaterialMetadata.js";
import { component_reference_key } from "@fracto/sdk/FractoComponentTools.js";
import {
  create_component_section_content,
  component_sections,
} from "../src/pages/games/ComponentSectionContent.js";

const ref = (id) => ({ id, revision: "a".repeat(64) });
const facts = {
  ...empty_material_construction(),
  kind: "model",
  placement: "ground",
  meters_per_unit: 1,
  dimensions_m: [0.1, 0.1, 0.1],
  footprint_m: [0.1, 0.1],
  ground_anchor_m: [0, 0, 0],
  up_axis: "y",
  forward_axis: "z",
};
const object = (id, z, more = {}) => ({
  id: randomUUID(),
  asset: ref(id),
  position: [0, 0, z],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
  group_id: null,
  ...more,
});
const descriptor = (id) => ({
  material: { ...ref(id), construction: facts },
  runtime: { id, model: `${id}.glb`, resources: [`${id}.glb`], format: "glb" },
});
const drain = () => new Promise((resolve) => setImmediate(resolve));
const pose = (z) => ({ position: [0, 0, z] });

test("first section renders without distant rocks; lookahead shares models, preserves clocks and disposes once", async () => {
  const document = create_component_document(randomUUID(), "Stream");
  document.floor = { size: [1, 20], texture_repeat: [1, 20], asset: null };
  document.animation_speed = 0.25;
  document.objects = [
    object("grass", 8),
    object("grass", 0),
    object("grass", -8),
    object("distant-rock", -8),
  ];
  const descriptors = Object.fromEntries(
    ["grass", "distant-rock"].map((id) => [
      component_reference_key(ref(id)),
      descriptor(id),
    ]),
  );
  const loads = [],
    statuses = [],
    sources = [];
  let disposed = 0,
    release_rock;
  const content = create_component_section_content({
    scene: new THREE.Scene(),
    render() {},
    on_status: (s) => statuses.push(s),
    resolve: async () => descriptors,
    load: async (asset) => {
      loads.push(asset.id);
      const source = new THREE.Mesh(
        new THREE.BoxGeometry(),
        new THREE.MeshBasicMaterial(),
      );
      sources.push(source);
      source.geometry.addEventListener("dispose", () => disposed++);
      source.animations = [
        new THREE.AnimationClip("wind", 100, [
          new THREE.VectorKeyframeTrack(
            ".position",
            [0, 100],
            [0, 0, 0, 100, 0, 0],
          ),
        ]),
      ];
      if (asset.id === "distant-rock")
        await new Promise((resolve) => {
          release_rock = resolve;
        });
      return source;
    },
  });
  await content.update(document, pose(8), 0.5);
  assert.equal(content.revealing, true);
  content.reveal(1.2);
  assert.equal(content.revealing, false);
  assert.deepEqual(loads, ["grass"]);
  assert.equal(statuses.at(-1), "content_ready");
  const items = () => {
    const nodes = [];
    content.root.traverse((node) => {
      if (node.userData.component_item_id) nodes.push(node);
    });
    return nodes;
  };
  assert.equal(items().length, 2); // floor and the initial grass, not the full strip.
  content.animate(4);
  assert.equal(content.focus(pose(0), 0.5), false);
  await drain();
  assert.equal(content.focus(pose(0), 0.5), true);
  assert.deepEqual(loads, ["grass"]);
  const grass_clones = [];
  content.root.traverse((node) => {
    if (node.isMesh && node.animations?.length) grass_clones.push(node);
  });
  assert.equal(grass_clones.length, 2);
  for (const clone of grass_clones) assert.equal(clone.position.x, 1);
  assert.equal(content.focus(pose(-8), 0.5), false);
  await drain();
  assert.deepEqual(loads, ["grass", "distant-rock"]);
  assert.equal(content.focus(pose(-8), 0.5), false);
  release_rock();
  await drain();
  assert.equal(content.focus(pose(-8), 0.5), true);
  assert.equal(items().length, 5);
  content.dispose();
  await drain();
  assert.equal(disposed, sources.length);
});

test("motion envelopes and offscreen shadow casters participate in section selection", () => {
  const document = create_component_document(randomUUID(), "Patrol");
  document.objects = [
    object("insect", 0, {
      motion: { algorithm: "facing-patrol-v1", distance_m: 3, speed_mps: 0.01 },
    }),
  ];
  const [section] = component_sections(document, {
    [component_reference_key(ref("insect"))]: descriptor("insect"),
  });
  assert.ok(section.min < 0);
  assert.ok(section.max > 3);
  assert.ok(section.reach > 0);
});

test("floor renders during model loading and a freed worker starts the next model without a batch barrier", async () => {
  const document = create_component_document(randomUUID(), "Queue");
  document.floor = { size: [1, 20], texture_repeat: [1, 20], asset: null };
  document.objects = Array.from({ length: 6 }, (_, i) =>
    object(`rock-${i}`, 0),
  );
  const descriptors = Object.fromEntries(
    document.objects.map((o) => [
      component_reference_key(o.asset),
      descriptor(o.asset.id),
    ]),
  );
  const pending = [],
    statuses = [];
  const content = create_component_section_content({
    scene: new THREE.Scene(),
    render() {},
    on_status: (s) => statuses.push(s),
    resolve: async () => descriptors,
    load: (asset) =>
      new Promise((resolve) =>
        pending.push({
          asset,
          finish: () =>
            resolve(
              new THREE.Mesh(
                new THREE.BoxGeometry(),
                new THREE.MeshBasicMaterial(),
              ),
            ),
        }),
      ),
  });
  const initial = content.update(document, pose(0), 0.5);
  await drain();
  let floor = false;
  content.root.traverse((node) => {
    floor ||= node.userData.component_item_id === "floor";
  });
  assert.equal(floor, true);
  assert.equal(pending.length, 4);
  assert.ok(!statuses.includes("content_ready"));
  pending[0].finish();
  await drain();
  assert.equal(pending.length, 5);
  // Disposing also cancels the sixth queued task; no late section may attach.
  content.dispose();
  for (const task of pending.slice(1)) task.finish();
  await initial;
  assert.equal(pending.length, 5);
  assert.ok(!statuses.includes("content_ready"));
});

test("a failed section never becomes ready or permits the camera to enter", async () => {
  const document = create_component_document(randomUUID(), "Failed");
  document.objects = [object("grass", 0)];
  const statuses = [];
  const content = create_component_section_content({
    scene: new THREE.Scene(),
    render() {},
    on_status: (s) => statuses.push(s),
    resolve: async () => ({
      [component_reference_key(ref("grass"))]: descriptor("grass"),
    }),
    load: async () => {
      throw new Error("offline");
    },
  });
  await content.update(document, pose(0), 0.5);
  assert.ok(statuses.includes("material_load_error"));
  assert.ok(!statuses.includes("content_ready"));
  assert.equal(content.focus(pose(0), 0.5), false);
  content.dispose();
});

test("disposal during a section load cannot attach late objects or leak shared prototypes", async () => {
  const document = create_component_document(randomUUID(), "Cancelled");
  document.objects = [object("grass", 0)];
  let finish,
    disposed = 0;
  const scene = new THREE.Scene(),
    statuses = [];
  const source = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial(),
  );
  source.geometry.addEventListener("dispose", () => disposed++);
  const content = create_component_section_content({
    scene,
    render() {},
    on_status: (s) => statuses.push(s),
    resolve: async () => ({
      [component_reference_key(ref("grass"))]: descriptor("grass"),
    }),
    load: () =>
      new Promise((resolve) => {
        finish = () => resolve(source);
      }),
  });
  const pending = content.update(document, pose(0), 0.5);
  await drain();
  content.dispose();
  finish();
  await pending;
  await drain();
  assert.equal(scene.children.length, 0);
  assert.equal(disposed, 1);
  assert.ok(!statuses.includes("content_ready"));
});
