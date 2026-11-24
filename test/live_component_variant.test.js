import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { component_document_json } from "@fracto/sdk/FractoComponentDocument.js";
import { preview_component_variant } from "@fracto/sdk/FractoComponentVariant.js";
import { sample_component_motion } from "@fracto/sdk/FractoComponentMotion.js";
import { component_reference_key } from "@fracto/sdk/FractoComponentTools.js";
import { create_component_content } from "../src/pages/games/ComponentStageContent.js";

test(
  "live zoomies preview scales all insect patrols and real walk bones, then restores base without saving",
  {
    skip: process.env.FRACTO_TEST_COMPONENT_VARIANT !== "1",
  },
  async () => {
    globalThis.self ??= globalThis;
    const get = async (url) => {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      assert.equal(response.status, 200);
      return response;
    };
    const url =
      "http://localhost:3102/component-documents/0bb37175-0459-49bf-b5fc-f918bf090563";
    const base = await (await get(url)).json();
    const variants = await (await get(`${url}/variants`)).json();
    const variant = variants.variants.find(
      (item) => item.key === "ladybug-zoomies",
    );
    assert.ok(variant);
    const before = component_document_json(base.document);
    const preview = preview_component_variant(
      base.document,
      variant,
      base.revision,
    );
    const insects = base.document.objects.filter(
      (item) => item.group_id === variant.role_groups.walking_insects,
    );
    assert.equal(insects.length, 20);
    const ref = insects[0].asset;
    const catalog = `http://localhost:3103/environment-catalog/${ref.id}`;
    const descriptor = await (
      await get(`${catalog}/construction/runtime?revision=${ref.revision}`)
    ).json();
    const bytes = await (
      await get(`${catalog}/files/${descriptor.runtime.model}`)
    ).arrayBuffer();
    const gltf = await new GLTFLoader()
      .register(() => ({
        name: "variant_texture_stub",
        loadTexture: () => Promise.resolve(new THREE.Texture()),
      }))
      .parseAsync(bytes, "");
    gltf.scene.animations = gltf.animations;
    assert.ok(gltf.animations.length);
    const expected = clone(gltf.scene),
      mixer = new THREE.AnimationMixer(expected);
    mixer.clipAction(gltf.animations[0]).play();
    const bone_pose = (root) => {
      const result = [];
      root.traverse((node) => {
        if (node.isBone)
          result.push(
            ...node.position.toArray(),
            ...node.quaternion.toArray(),
            ...node.scale.toArray(),
          );
      });
      return result;
    };
    assert.ok(bone_pose(expected).length);
    const states = [];
    const content = create_component_content({
      scene: new THREE.Scene(),
      render() {},
      on_status: (s) => states.push(s),
      resolve: async () => ({ [component_reference_key(ref)]: descriptor }),
      load: async () => gltf.scene,
    });
    try {
      // Exercise the saved insects and real rig. Floor texture and grass are
      // omitted only in this test to avoid DOM image decoding in Node.
      for (const fast of [false, true, false]) {
        const document = fast ? preview.document : base.document;
        const objects = document.objects.filter(
          (item) => item.group_id === variant.role_groups.walking_insects,
        );
        await content.update(
          { ...document, floor: null, objects, scatters: [] },
          fast ? preview : {},
        );
        assert.equal(states.at(-1), "content_ready");
        let elapsed = 0;
        mixer.timeScale = document.animation_speed * (fast ? 8 : 1);
        mixer.setTime(0);
        for (const delta of [0.19, 0.27, 0.41]) {
          elapsed += delta;
          content.animate(delta);
          mixer.update(delta);
          objects.forEach((object, i) => {
            const target = sample_component_motion(
              object,
              elapsed * document.animation_speed,
            );
            const node = content.root.children[i];
            node.position
              .toArray()
              .forEach((v, axis) =>
                assert.ok(Math.abs(v - target.position[axis]) < 1e-10),
              );
            const actual = bone_pose(node),
              reference = bone_pose(expected);
            assert.equal(actual.length, reference.length);
            actual.forEach((v, index) =>
              assert.ok(Math.abs(v - reference[index]) < 1e-7),
            );
          });
        }
      }
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
