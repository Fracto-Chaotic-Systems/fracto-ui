import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { inventory_spec_gloss } from "../src/pages/games/InventorySpecGloss.js";
import { oriented_component_instance } from "../src/pages/games/ComponentStageGeometry.js";

// Opt-in consumer verification of real geometry. Texture decoding is omitted;
// it does not affect geometry bounds. No catalog/draft mutations or model calls.
test(
  "live calibrated materials match stage geometry and ground anchors",
  {
    skip: process.env.FRACTO_TEST_MATERIAL_CALIBRATION !== "1",
    timeout: 180000,
  },
  async (t) => {
    globalThis.self ??= globalThis;
    globalThis.window ??= globalThis;
    globalThis.ProgressEvent ??= class {};
    const base =
      process.env.FRACTO_TEST_ASSET_URL ||
      "http://localhost:3103/environment-catalog";
    const read = async (url) => {
      const r = await fetch(url);
      assert.equal(r.status, 200);
      return r;
    };
    const original = THREE.TextureLoader.prototype.load;
    const measurements = [];
    THREE.TextureLoader.prototype.load = () => new THREE.Texture();
    try {
      for (const id of [
        "grass-patch-001",
        "animated-grass",
        "grasses3",
        "yard-grass",
        "shrub1-2",
        "shrub2",
        "tree-2",
        "tree-wind",
        "trees-animate",
        "trees-animate-2",
      ]) {
        await t.test(id, async () => {
          const { material } = await (
            await read(`${base}/${id}/construction`)
          ).json();
          assert.equal(material.placement_ready, true);
          const { runtime } = await (
            await read(
              `${base}/${id}/construction/runtime?revision=${material.revision}`,
            )
          ).json();
          const url = `${base}/${id}/files/${runtime.model.split("/").map(encodeURIComponent).join("/")}`;
          const bytes = await (await read(url)).arrayBuffer();
          if (id === "tree-2" && runtime.format === "glb") {
            const glb = Buffer.from(bytes);
            const json = JSON.parse(
              glb.subarray(20, 20 + glb.readUInt32LE(12)).toString("utf8"),
            );
            assert.ok(
              json.materials.some(
                (material) =>
                  material.alphaMode === "MASK" &&
                  material.pbrMetallicRoughness?.baseColorTexture,
              ),
            );
            assert.ok(
              json.images.some((image) => image.mimeType === "image/png"),
            );
          }
          let prototype;
          if (runtime.format === "fbx")
            prototype = new FBXLoader().parse(bytes, new URL(".", url).href);
          else
            prototype = (
              await new GLTFLoader()
                .register(inventory_spec_gloss)
                .register(() => ({
                  name: "calibration_texture_stub",
                  loadTexture: () => Promise.resolve(new THREE.Texture()),
                }))
                .parseAsync(bytes, new URL(".", url).href)
            ).scene;
          prototype.updateMatrixWorld(true);
          prototype.traverse((node) => node.skeleton?.update());
          const raw = new THREE.Box3().setFromObject(prototype, true);
          measurements.push({
            id,
            revision: material.revision,
            runtime: runtime.model,
            raw_min: raw.min.toArray(),
            raw_max: raw.max.toArray(),
            raw_size: raw.getSize(new THREE.Vector3()).toArray(),
          });
          const placed = oriented_component_instance(
            prototype,
            material.construction,
            {
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
            },
            "calibration",
          );
          placed.updateMatrixWorld(true);
          placed.traverse((node) => node.skeleton?.update());
          const bounds = new THREE.Box3().setFromObject(placed, true);
          const actual = bounds.getSize(new THREE.Vector3()).toArray();
          const expected = material.construction.dimensions_m;
          for (let axis = 0; axis < 3; axis++)
            assert.ok(
              Math.abs(actual[axis] - expected[axis]) <
                Math.max(0.0001, expected[axis] * 0.001),
              `${id} axis ${axis}: stage ${actual[axis]}, metadata ${expected[axis]}`,
            );
          assert.ok(
            Math.abs(bounds.min.y) < 0.001,
            `${id} grounded at ${bounds.min.y}`,
          );
        });
      }
      await t.test(
        "dry_dirt exposes a registered original color texture",
        async () => {
          const { material } = await (
            await read(`${base}/dry-dirt/construction`)
          ).json();
          assert.equal(material.placement_ready, true);
          assert.equal(material.construction.kind, "surface");
          assert.deepEqual(material.construction.texture_size_m, [1, 1]);
          const { runtime } = await (
            await read(
              `${base}/dry-dirt/construction/runtime?revision=${material.revision}`,
            )
          ).json();
          const color = runtime.resources.find((file) =>
            /^runtime\/surface-base-color-.*\.png$/.test(file),
          );
          assert.ok(color);
          const image = Buffer.from(
            await (await read(`${base}/dry-dirt/files/${color}`)).arrayBuffer(),
          );
          assert.equal(image.readUInt32BE(16), 2048);
          assert.equal(image.readUInt32BE(20), 2048);
        },
      );
    } finally {
      THREE.TextureLoader.prototype.load = original;
      const report = path.join(
        import.meta.dirname,
        "../runtime/stage-calibration-measurements.json",
      );
      await fs.mkdir(path.dirname(report), { recursive: true });
      await fs.writeFile(report, JSON.stringify(measurements, null, 2) + "\n");
    }
  },
);
