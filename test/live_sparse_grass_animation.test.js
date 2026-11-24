import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { component_document_json } from "@fracto/sdk/FractoComponentDocument.js";
import { component_reference_key } from "@fracto/sdk/FractoComponentTools.js";
import { create_component_content } from "../src/pages/games/ComponentStageContent.js";
test(
  "saved sparse grass runs at its authored native 1x clock independently of the slow component",
  { skip: process.env.FRACTO_TEST_SPARSE_GRASS !== "1" },
  async () => {
    globalThis.self ??= globalThis;
    const get = async (url) => {
      const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
      assert.equal(r.status, 200);
      return r;
    };
    const url =
        "http://localhost:3102/component-documents/0bb37175-0459-49bf-b5fc-f918bf090563",
      base = await (await get(url)).json(),
      doc = base.document,
      objects = doc.objects.filter((o) => o.asset.id === "animated-grass");
    assert.equal(objects.length, 140);
    assert.ok(objects.every((o) => o.animation_speed === 1));
    assert.equal(doc.animation_speed, 0.125);
    const before = component_document_json(doc),
      ref = objects[0].asset,
      catalog = "http://localhost:3103/environment-catalog/" + ref.id,
      descriptor = await (
        await get(catalog + "/construction/runtime?revision=" + ref.revision)
      ).json(),
      bytes = await (
        await get(catalog + "/files/" + descriptor.runtime.model)
      ).arrayBuffer();
    const gltf = await new GLTFLoader()
      .register(() => ({
        name: "sparse_texture_stub",
        loadTexture: () => Promise.resolve(new THREE.Texture()),
      }))
      .parseAsync(bytes, "");
    gltf.scene.animations = gltf.animations;
    const expected = clone(gltf.scene),
      mixer = new THREE.AnimationMixer(expected);
    mixer.clipAction(gltf.animations[0]).play();
    const pose = (root) => {
      const data = [];
      root.traverse((n) =>
        data.push(
          ...n.position.toArray(),
          ...n.quaternion.toArray(),
          ...n.scale.toArray(),
          ...(n.morphTargetInfluences ?? []),
        ),
      );
      return data;
    };
    const content = create_component_content({
      scene: new THREE.Scene(),
      render() {},
      on_status() {},
      resolve: async () => ({ [component_reference_key(ref)]: descriptor }),
      load: async () => gltf.scene,
    });
    try {
      await content.update({ ...doc, floor: null, objects, scatters: [] });
      assert.equal(content.root.children.length, 140);
      const initial = pose(expected);
      let changed = false;
      for (const delta of [0.19, 0.27, 0.41]) {
        content.animate(delta);
        mixer.update(delta);
        const target = pose(expected);
        changed ||= target.some((v, i) => Math.abs(v - initial[i]) > 1e-7);
        for (const placed of content.root.children) {
          const actual = pose(
            placed.children[0].children[0].children[0].children[0],
          );
          assert.equal(actual.length, target.length);
          actual.forEach((v, i) => assert.ok(Math.abs(v - target[i]) < 1e-7));
        }
      }
      assert.ok(changed);
    } finally {
      mixer.stopAllAction();
      mixer.uncacheRoot(expected);
      content.dispose();
    }
    const after = await (await get(url)).json();
    assert.equal(after.revision, base.revision);
    assert.equal(component_document_json(after.document), before);
  },
);
