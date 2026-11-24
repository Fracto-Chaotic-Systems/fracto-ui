import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { oriented_component_instance } from "../src/pages/games/ComponentStageGeometry.js";

// Read-only measurement through public service endpoints and the real stage transform.
globalThis.self ??= globalThis;
const get = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw Error(`${r.status}: ${url}`);
  return r;
};
const { document, revision } = await (
  await get(
    "http://localhost:3102/component-documents/0bb37175-0459-49bf-b5fc-f918bf090563",
  )
).json();
const results = [];
for (const id of ["yard-grass", "animated-grass"]) {
  const objects = document.objects.filter((o) => o.asset.id === id),
    ref = objects[0].asset;
  const base = "http://localhost:3103/environment-catalog/" + id;
  const descriptor = await (
    await get(base + "/construction/runtime?revision=" + ref.revision)
  ).json();
  const gltf = await new GLTFLoader()
    .register(() => ({
      name: "grounding_texture_stub",
      loadTexture: () => Promise.resolve(new THREE.Texture()),
    }))
    .parseAsync(
      await (
        await get(base + "/files/" + descriptor.runtime.model)
      ).arrayBuffer(),
      "",
    );
  const placed = oriented_component_instance(
    gltf.scene,
    descriptor.material.construction,
    { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    id,
  );
  const model = placed.children[0].children[0].children[0].children[0],
    mixer = new THREE.AnimationMixer(model);
  mixer.clipAction(gltf.animations[0]).play();
  let min = Infinity,
    max = -Infinity;
  for (let frame = 0; frame <= 48; frame++) {
    mixer.setTime((gltf.animations[0].duration * frame) / 48);
    placed.updateMatrixWorld(true);
    placed.traverse((n) => n.skeleton?.update());
    const bounds = new THREE.Box3().setFromObject(placed, true);
    min = Math.min(min, bounds.min.y);
    max = Math.max(max, bounds.min.y);
  }
  const max_scaled_base = Math.max(...objects.map((o) => max * o.scale[1]));
  const target_y = Number(
    (-0.005 - 0.005 - Math.max(0, max_scaled_base) - 0.0001).toFixed(9),
  );
  const current_y = [...new Set(objects.map((o) => o.position[1]))];
  const minimum_observed_burial_m = Math.min(
    ...objects.map((o) => -0.005 - o.position[1] - max * o.scale[1]),
  );
  results.push({
    id,
    count: objects.length,
    current_y,
    sampled_frames: 49,
    native_base_y_range_m: [min, max],
    maximum_scaled_base_y_m: max_scaled_base,
    recommended_anchor_y_m: target_y,
    minimum_observed_burial_m,
  });
  mixer.stopAllAction();
  mixer.uncacheRoot(model);
}
console.log(
  JSON.stringify(
    { revision, floor_y_m: -0.005, minimum_burial_m: 0.005, results },
    null,
    2,
  ),
);
