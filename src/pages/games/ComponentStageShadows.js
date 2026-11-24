import * as THREE from "three";
import { component_lighting } from "@fracto/sdk/FractoComponentDocument.js";

export function configure_component_shadows(renderer, light) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  light.castShadow = true;
  const size = Math.min(4096, renderer.capabilities.maxTextureSize);
  light.shadow.mapSize.set(size, size);
  light.shadow.bias = -0.000005;
  light.shadow.normalBias = 0.0002;
}

// Intersect the component box with the view frustum. Plane triples cover the
// clipped volume even when no original box corner is inside the camera view.
export function visible_component_shadow_bounds(bounds, camera) {
  camera.updateMatrixWorld();
  const frustum = new THREE.Frustum().setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    ),
  );
  const planes = [...frustum.planes];
  for (const axis of ["x", "y", "z"]) {
    const normal = new THREE.Vector3();
    normal[axis] = 1;
    planes.push(new THREE.Plane(normal.clone(), -bounds.min[axis]));
    planes.push(new THREE.Plane(normal.negate(), bounds.max[axis]));
  }
  const visible = new THREE.Box3();
  for (let a = 0; a < planes.length - 2; a++)
    for (let b = a + 1; b < planes.length - 1; b++)
      for (let c = b + 1; c < planes.length; c++) {
        const A = planes[a],
          B = planes[b],
          C = planes[c];
        const bc = new THREE.Vector3().crossVectors(B.normal, C.normal);
        const determinant = A.normal.dot(bc);
        if (Math.abs(determinant) < 1e-10) continue;
        const point = bc
          .multiplyScalar(-A.constant)
          .addScaledVector(
            new THREE.Vector3().crossVectors(C.normal, A.normal),
            -B.constant,
          )
          .addScaledVector(
            new THREE.Vector3().crossVectors(A.normal, B.normal),
            -C.constant,
          )
          .divideScalar(determinant);
        if (planes.every((plane) => plane.distanceToPoint(point) >= -1e-5))
          visible.expandByPoint(point);
      }
  if (visible.isEmpty()) return bounds.clone();
  // Offscreen plants may still shadow visible dirt. Keep the full height and
  // the maximum horizontal shadow reach at the stage light's 4:3 elevation.
  const reach = ((bounds.max.y - bounds.min.y) * 4) / 3 + 0.05;
  visible.min.y = bounds.min.y;
  visible.max.y = bounds.max.y;
  visible.min.x -= reach;
  visible.max.x += reach;
  visible.min.z -= reach;
  visible.max.z += reach;
  return visible.intersect(bounds);
}

// Overview covers the complete visible strip; close views spend the same map
// on nearby ground so millimetre-wide sparse blades retain their shadows.
export function fit_component_shadows(
  light,
  root,
  document,
  view_camera,
  cached_bounds,
) {
  let bounds = cached_bounds
    ? cached_bounds.clone()
    : new THREE.Box3().setFromObject(root);
  if (bounds.isEmpty()) return;
  if (view_camera)
    bounds = visible_component_shadow_bounds(bounds, view_camera);
  const center = bounds.getCenter(new THREE.Vector3());
  const radius = Math.max(
    bounds.getSize(new THREE.Vector3()).length() / 2,
    0.1,
  );
  const angle =
    (component_lighting(document).direction_degrees * Math.PI) / 180;
  const direction = new THREE.Vector3(
    Math.cos(angle) * 4,
    3,
    Math.sin(angle) * 4,
  ).normalize();
  light.target.position.copy(center);
  light.position.copy(center).addScaledVector(direction, radius * 3 + 1);
  light.target.updateMatrixWorld();
  light.updateMatrixWorld();
  light.shadow.updateMatrices(light);
  const camera = light.shadow.camera,
    projected = new THREE.Box3();
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z])
        projected.expandByPoint(
          new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse),
        );
  const padding = Math.max(radius * 0.025, 0.02);
  camera.left = projected.min.x - padding;
  camera.right = projected.max.x + padding;
  camera.bottom = projected.min.y - padding;
  camera.top = projected.max.y + padding;
  camera.near = Math.max(0.001, -projected.max.z - padding);
  camera.far = -projected.min.z + padding;
  camera.updateProjectionMatrix();
  light.shadow.updateMatrices(light);
}

export function prepare_component_shadow_meshes(root) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    // Three honours native MASK alpha in its depth pass. BLEND foliage needs
    // a shadow-only cutout, leaving the visible material's transparency intact.
    if (
      [node.material]
        .flat()
        .some(
          (m) => m.transparent && (m.map || m.alphaMap) && m.alphaTest === 0,
        )
    ) {
      const depth = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
      });
      depth.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <alphatest_fragment>",
          "#include <alphatest_fragment>\nif (diffuseColor.a < 0.5) discard;",
        );
      };
      depth.customProgramCacheKey = () => "component-shadow-cutout-v1";
      node.customDepthMaterial = depth;
    }
  });
}
