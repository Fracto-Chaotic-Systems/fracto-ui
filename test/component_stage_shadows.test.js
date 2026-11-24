import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  configure_component_shadows,
  fit_component_shadows,
  prepare_component_shadow_meshes,
  visible_component_shadow_bounds,
} from "../src/pages/games/ComponentStageShadows.js";

test("close views concentrate shadow texels while retaining offscreen caster reach", () => {
  const bounds = new THREE.Box3(
    new THREE.Vector3(11.5, -0.005, -17),
    new THREE.Vector3(12.5, 0.3, 3),
  );
  const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.01, 10);
  camera.position.set(12, 2, -7);
  camera.up.set(0, 0, -1);
  camera.lookAt(12, 0, -7);
  const visible = visible_component_shadow_bounds(bounds, camera);
  assert.ok(visible.getSize(new THREE.Vector3()).z < 2);
  assert.ok(visible.min.z < -7.9 && visible.max.z > -6.1);
  assert.equal(visible.min.y, bounds.min.y);
  assert.equal(visible.max.y, bounds.max.y);
  assert.ok(bounds.containsBox(visible));
});
import {
  oriented_component_instance,
  dispose_component_resources,
} from "../src/pages/games/ComponentStageGeometry.js";

test("shadow camera covers translated long floors at every light direction", () => {
  const root = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.BoxGeometry(1, 0.3, 20));
  root.add(floor);
  root.position.set(12, 0, -7);
  const light = new THREE.DirectionalLight(),
    renderer = { shadowMap: {}, capabilities: { maxTextureSize: 2048 } };
  configure_component_shadows(renderer, light);
  assert.equal(renderer.shadowMap.enabled, true);
  assert.equal(light.castShadow, true);
  assert.equal(light.shadow.mapSize.x, 2048);
  for (const direction_degrees of [0, 45, 90, 180, 270, 360]) {
    fit_component_shadows(light, root, {
      lighting: { direction_degrees, intensity: 3 },
    });
    const bounds = new THREE.Box3().setFromObject(root);
    for (const x of [bounds.min.x, bounds.max.x])
      for (const y of [bounds.min.y, bounds.max.y])
        for (const z of [bounds.min.z, bounds.max.z]) {
          const p = new THREE.Vector3(x, y, z).project(light.shadow.camera);
          assert.ok(
            [p.x, p.y, p.z].every((v) => v >= -1 && v <= 1),
            `clipped at ${direction_degrees}: ${p.toArray()}`,
          );
        }
  }
  floor.geometry.dispose();
  floor.material.dispose();
  light.shadow.dispose();
});

test("shadow-only foliage cutouts retain visible materials and release clone depth resources", () => {
  const material = new THREE.MeshStandardMaterial({
    transparent: true,
    map: new THREE.Texture(),
  });
  const source = new THREE.Mesh(new THREE.PlaneGeometry(), material);
  const facts = {
    up_axis: "y",
    forward_axis: "z",
    ground_anchor_m: [0, 0, 0],
    meters_per_unit: 1,
  };
  const placed = oriented_component_instance(
    source,
    facts,
    { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    "grass",
  );
  const meshes = [];
  placed.traverse((n) => {
    if (n.isMesh) meshes.push(n);
  });
  const mesh = meshes[0],
    depth = mesh.customDepthMaterial;
  assert.equal(mesh.castShadow, true);
  assert.equal(mesh.receiveShadow, true);
  assert.equal(source.castShadow, false);
  assert.equal(source.customDepthMaterial, undefined);
  assert.equal(mesh.material, material);
  assert.equal(material.alphaTest, 0);
  assert.equal(material.transparent, true);
  const shader = { fragmentShader: THREE.ShaderLib.depth.fragmentShader };
  depth.onBeforeCompile(shader);
  assert.match(shader.fragmentShader, /if \(diffuseColor.a < 0.5\) discard;/);
  let disposed = 0;
  depth.addEventListener("dispose", () => disposed++);
  dispose_component_resources(placed, false);
  assert.equal(disposed, 1);
  const masked = new THREE.Mesh(
    new THREE.PlaneGeometry(),
    new THREE.MeshStandardMaterial({ alphaTest: 0.1 }),
  );
  prepare_component_shadow_meshes(masked);
  assert.equal(masked.castShadow, true);
  assert.equal(masked.customDepthMaterial, undefined);
  source.geometry.dispose();
  material.map.dispose();
  material.dispose();
  masked.geometry.dispose();
  masked.material.dispose();
});
