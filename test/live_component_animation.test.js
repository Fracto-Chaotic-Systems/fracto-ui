import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { create_component_content } from "../src/pages/games/ComponentStageContent.js";
import { component_reference_key } from "@fracto/sdk/FractoComponentTools.js";

test(
  "saved grass strip plays its real authored wind across every patch",
  { skip: process.env.FRACTO_TEST_COMPONENT_ANIMATION !== "1" },
  async () => {
    globalThis.self ??= globalThis;
    const read = async (url) => {
      const r = await fetch(url);
      assert.equal(r.status, 200);
      return r;
    };
    const { documents } = await (
      await read("http://localhost:3102/component-documents")
    ).json();
    const strip = documents.find((d) => d.name === "grass strip");
    assert.ok(strip);
    const { document } = await (
      await read(`http://localhost:3102/component-documents/${strip.id}`)
    ).json();
    const before = JSON.stringify(document.objects);
    assert.ok(
      Number.isFinite(document.animation_speed) && document.animation_speed > 0,
    );
    const grass_objects = document.objects.filter(
      (o) => o.asset.id === "yard-grass",
    );
    assert.ok(grass_objects.length > 0);
    const ref = document.objects[0].asset;
    const base = `http://localhost:3103/environment-catalog/${ref.id}`;
    const descriptor = await (
      await read(`${base}/construction/runtime?revision=${ref.revision}`)
    ).json();
    const bytes = await (
      await read(`${base}/files/${descriptor.runtime.model}`)
    ).arrayBuffer();
    const gltf = await new GLTFLoader()
      .register(() => ({
        name: "animation_texture_stub",
        loadTexture: () => Promise.resolve(new THREE.Texture()),
      }))
      .parseAsync(bytes, "");
    gltf.scene.animations = gltf.animations;
    assert.ok(gltf.animations.length);
    const reference = new THREE.AnimationMixer(gltf.scene);
    reference.clipAction(gltf.animations[0]).play();
    reference.timeScale = document.animation_speed;
    const content = create_component_content({
      scene: new THREE.Scene(),
      render() {},
      on_status() {},
      resolve: async () => ({ [component_reference_key(ref)]: descriptor }),
      load: async () => gltf.scene,
    });
    try {
      // Floor decoding is unrelated to morph playback; use the actual saved objects.
      await content.update({
        ...document,
        floor: null,
        objects: grass_objects,
      });
      assert.equal(content.animated, true);
      assert.equal(content.root.children.length, grass_objects.length);
      const meshes = [];
      content.root.traverse((n) => {
        if (n.morphTargetInfluences) meshes.push(n);
      });
      assert.equal(meshes.length, grass_objects.length);
      const initial = meshes.map((m) => [...m.morphTargetInfluences]);
      let changed = new Set();
      for (let i = 0; i < 5; i++) {
        content.animate(gltf.animations[0].duration * 0.137);
        reference.update(gltf.animations[0].duration * 0.137);
        let source_mesh;
        gltf.scene.traverse((n) => {
          if (n.morphTargetInfluences) source_mesh = n;
        });
        meshes.forEach((m, index) => {
          assert.deepEqual(
            m.morphTargetInfluences,
            source_mesh.morphTargetInfluences,
          );
          if (
            m.morphTargetInfluences.some(
              (v, j) => Math.abs(v - initial[index][j]) > 1e-5,
            )
          )
            changed.add(index);
        });
      }
      assert.equal(changed.size, grass_objects.length);
      assert.equal(JSON.stringify(document.objects), before);
      content.root.children.forEach((node, i) => {
        assert.deepEqual(node.position.toArray(), grass_objects[i].position);
        assert.deepEqual(node.scale.toArray(), grass_objects[i].scale);
      });
    } finally {
      reference.stopAllAction();
      reference.uncacheRoot(gltf.scene);
      content.dispose();
    }
    assert.equal(content.animated, false);
  },
);
