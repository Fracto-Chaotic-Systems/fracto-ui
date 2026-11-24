import * as THREE from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
export function oriented_component_instance(
  prototype,
  facts,
  transform,
  id,
  on_model,
) {
  const axis = (value) => {
    const result = new THREE.Vector3();
    result[value.at(-1)] = value.startsWith("-") ? -1 : 1;
    return result;
  };
  const up = axis(facts.up_axis),
    forward = axis(facts.forward_axis),
    right = new THREE.Vector3().crossVectors(up, forward);
  const placed = new THREE.Group();
  placed.userData.component_item_id = id;
  placed.position.fromArray(transform.position);
  placed.rotation.fromArray([...transform.rotation, "XYZ"]);
  placed.scale.fromArray(transform.scale);
  const oriented = new THREE.Group();
  oriented.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(right, up, forward).invert(),
  );
  const anchored = new THREE.Group();
  anchored.position.fromArray(facts.ground_anchor_m).negate();
  const units = new THREE.Group();
  units.scale.setScalar(facts.meters_per_unit);
  const model = clone(prototype);
  units.add(model);
  on_model?.(model);
  anchored.add(units);
  oriented.add(anchored);
  placed.add(oriented);
  return placed;
}
export function dispose_component_resources(root, resources = true) {
  const geometry = new Set(),
    materials = new Set(),
    textures = new Set();
  root.traverse((node) => {
    node.skeleton?.dispose();
    if (node.isInstancedMesh) node.dispose();
    if (!resources) return;
    if (node.geometry) geometry.add(node.geometry);
    for (const material of [node.material].flat().filter(Boolean)) {
      materials.add(material);
      for (const value of Object.values(material))
        if (value?.isTexture) textures.add(value);
    }
  });
  geometry.forEach((item) => item.dispose());
  materials.forEach((item) => item.dispose());
  textures.forEach((item) => {
    item.source?.data?.close?.();
    item.dispose();
  });
}
