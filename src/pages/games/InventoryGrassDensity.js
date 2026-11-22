import * as THREE from "three";

export const MAX_GRASS_DENSITY = 8;
export function normalize_grass_density(value) {
  return Number.isFinite(value)
    ? THREE.MathUtils.clamp(value, 0, MAX_GRASS_DENSITY)
    : 1;
}
const random = (seed) => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return value - Math.floor(value);
};

// Add only in-memory instances; neither the loaded geometry nor its files change.
export function create_grass_density(root) {
  root.updateMatrixWorld(true);
  const groups = new Map(),
    meshes = [];
  root.traverse((node) => {
    if (!node.isMesh || node.isSkinnedMesh || node.isInstancedMesh) return;
    meshes.push(node);
    const key = `${node.geometry.uuid}/${[node.material]
      .flat()
      .map((material) => material.uuid)
      .join("/")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(node);
  });
  const originals = [...groups.values()]
    .filter((items) => items.length > 1)
    .sort((a, b) => b.length - a.length)[0];
  if (!originals) return null;
  const inverse = root.matrixWorld.clone().invert();
  const matrices = originals.map((node) =>
    inverse.clone().multiply(node.matrixWorld),
  );
  const surface = new THREE.Box3();
  meshes
    .filter((node) => !originals.includes(node))
    .forEach((node) => surface.union(new THREE.Box3().setFromObject(node)));
  if (surface.isEmpty()) surface.setFromObject(root);
  surface.applyMatrix4(inverse);
  const span = surface.getSize(new THREE.Vector3());
  const first = originals[0],
    base_count = originals.length;
  const instanced = new THREE.InstancedMesh(
    first.geometry,
    first.material,
    base_count * MAX_GRASS_DENSITY,
  );
  instanced.name = "Inventory grass density preview";
  const position = new THREE.Vector3(),
    rotation = new THREE.Quaternion(),
    scale = new THREE.Vector3();
  const yaw = new THREE.Quaternion(),
    matrix = new THREE.Matrix4(),
    up = new THREE.Vector3(0, 1, 0);
  for (let index = 0; index < instanced.instanceMatrix.count; index++) {
    const source = matrices[index % base_count];
    if (index < base_count) {
      instanced.setMatrixAt(index, source);
      continue;
    }
    source.decompose(position, rotation, scale);
    position.x = surface.min.x + span.x * (0.02 + random(index * 3 + 1) * 0.96);
    position.z = surface.min.z + span.z * (0.02 + random(index * 3 + 2) * 0.96);
    yaw.setFromAxisAngle(up, random(index * 3 + 3) * Math.PI * 2);
    rotation.premultiply(yaw);
    instanced.setMatrixAt(index, matrix.compose(position, rotation, scale));
  }
  instanced.instanceMatrix.needsUpdate = true;
  instanced.computeBoundingBox();
  instanced.computeBoundingSphere();
  originals.forEach((node) => {
    node.visible = false;
  });
  root.add(instanced);
  instanced.count = base_count;
  const triangles_per_clump =
    (first.geometry.index?.count || first.geometry.attributes.position.count) /
    3;
  return {
    base_count,
    mesh: instanced,
    set(value) {
      const count = Math.round(base_count * normalize_grass_density(value));
      instanced.count = count;
      return {
        count,
        triangle_delta: (count - base_count) * triangles_per_clump,
      };
    },
  };
}
