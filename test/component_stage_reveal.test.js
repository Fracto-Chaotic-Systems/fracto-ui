import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  create_component_reveal,
  COMPONENT_REVEAL_SECONDS,
} from "../src/pages/games/ComponentStageReveal.js";
import { prepare_component_shadow_meshes } from "../src/pages/games/ComponentStageShadows.js";
import { InventorySpecGlossMaterial } from "../src/pages/games/InventorySpecGloss.js";

const shader = () => ({
  uniforms: {},
  fragmentShader:
    "#include <alphatest_fragment>\n#include <roughnessmap_fragment>\n#include <lights_physical_fragment>",
});
test("arriving material groups fade together with their shadows, retaining alpha cutouts and shader adapters", () => {
  const material = new InventorySpecGlossMaterial({
    transparent: true,
    opacity: 0.7,
    map: new THREE.Texture(),
    depthWrite: false,
  });
  const root = new THREE.Group(),
    first = new THREE.Mesh(new THREE.BoxGeometry(), material),
    second = first.clone();
  root.add(first, second);
  prepare_component_shadow_meshes(root);
  const original_depth = first.customDepthMaterial;
  const reveal = create_component_reveal(root);
  assert.equal(first.material, second.material);
  assert.notEqual(first.material, material);
  assert.equal(first.material.opacity, 0.7);
  assert.equal(first.material.depthWrite, false);
  assert.equal(material.alphaTest, 0);
  const color = shader(),
    depth = shader();
  first.material.onBeforeCompile(color);
  first.customDepthMaterial.onBeforeCompile(depth);
  assert.equal(color.uniforms.componentReveal, depth.uniforms.componentReveal);
  assert.equal(color.uniforms.componentReveal.value, 0);
  assert.match(color.fragmentShader, /material\.diffuseContribution/);
  assert.match(depth.fragmentShader, /diffuseColor.a < 0.5/);
  assert.match(color.fragmentShader, /componentReveal <= componentRevealNoise/);
  reveal.update(COMPONENT_REVEAL_SECONDS / 2);
  assert.equal(color.uniforms.componentReveal.value, 0.5);
  assert.equal(reveal.active, true);
  reveal.update(COMPONENT_REVEAL_SECONDS / 2);
  assert.equal(reveal.active, false);
  assert.equal(first.material, material);
  assert.equal(second.material, material);
  assert.equal(first.customDepthMaterial, original_depth);
  assert.equal(color.uniforms.componentReveal.value, 1);
  assert.equal(material.opacity, 0.7);
  first.geometry.dispose();
  material.dispose();
  material.map.dispose();
  first.customDepthMaterial.dispose();
  second.customDepthMaterial.dispose();
});

test("completed and cancelled reveals release only temporary materials, including arrays, exactly once", () => {
  const materials = [
    new THREE.MeshStandardMaterial({ alphaTest: 0.4 }),
    new THREE.MeshBasicMaterial(),
  ];
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), materials);
  let source_disposals = 0,
    temporary_disposals = 0;
  for (const material of materials)
    material.addEventListener("dispose", () => source_disposals++);
  const reveal = create_component_reveal(mesh);
  for (const material of [...mesh.material, mesh.customDepthMaterial])
    material.addEventListener("dispose", () => temporary_disposals++);
  assert.equal(mesh.material[0].alphaTest, 0.4);
  reveal.dispose();
  reveal.dispose();
  reveal.update(20);
  assert.equal(temporary_disposals, 3);
  assert.equal(source_disposals, 0);
  assert.equal(mesh.material, materials);
  assert.equal(mesh.customDepthMaterial, undefined);
  mesh.geometry.dispose();
  materials.forEach((m) => m.dispose());
});
