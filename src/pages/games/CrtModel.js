import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { create_crt_cables } from "./CrtCables.js";
import { create_crt_casing } from "./CrtCasing.js";
import { add_crt_vents } from "./CrtVents.js";
import { create_crt_armature } from "./CrtArmature.js";

const material = (color, metalness = 0, roughness = 0.5) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness });

function box(parent, size, position, finish, radius = 0.06) {
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(...size, 3, radius),
    finish,
  );
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function bearing(parent, position, finish, radius = 0.17) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.23, 24),
    finish,
  );
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

// A superellipse boundary gives the tube rounded corners and gently bowed edges.
// Concentric rings push the center of the glass out beyond its perimeter.
export function create_tube_geometry() {
  const positions = [0, 0, 0.15],
    uvs = [0.5, 0.5],
    indices = [];
  const segments = 96,
    rings = 14;
  for (let ring = 1; ring <= rings; ring++) {
    const r = ring / rings;
    for (let segment = 0; segment < segments; segment++) {
      const angle = (segment / segments) * Math.PI * 2;
      const c = Math.cos(angle),
        s = Math.sin(angle);
      const x = Math.sign(c) * Math.abs(c) ** 0.55 * 0.67 * r;
      const y = Math.sign(s) * Math.abs(s) ** 0.55 * 0.49 * r;
      positions.push(x, y, 0.15 * (1 - r * r));
      uvs.push(x / 1.34 + 0.5, y / 0.98 + 0.5);
      const current = 1 + (ring - 1) * segments + segment;
      const next = 1 + (ring - 1) * segments + ((segment + 1) % segments);
      if (ring === 1) indices.push(0, current, next);
      else {
        const previous = current - segments,
          previous_next = next - segments;
        indices.push(previous, current, next, previous, next, previous_next);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function create_crt_model(scene) {
  const { shell, bezel } = create_crt_casing();
  const arm = create_crt_armature();
  const dark = material("#202b30", 0.45, 0.4);
  const steel = material("#7f969d", 0.8, 0.26);
  const bracket = box(
    scene,
    [0.72, 0.13, 0.66],
    [-1.35, 1.96, -0.75],
    arm.dark,
  );
  for (const x of [-1.61, -1.09]) {
    for (const z of [-0.97, -0.53]) {
      const bolt = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 10, 8),
        arm.brass,
      );
      bolt.position.set(x, 1.88, z);
      scene.add(bolt);
    }
  }

  const head = new THREE.Group();
  scene.add(head);
  box(head, [1.94, 1.43, 1.35], [0, 0, -0.1], shell, 0.18);
  add_crt_vents(head, shell);
  box(head, [0.5, 0.4, 0.16], [0, 0.28, -0.81], arm.steel);
  box(head, [1.8, 1.3, 0.16], [0, 0, 0.56], bezel, 0.13);
  box(head, [1.48, 1.12, 0.11], [-0.12, 0.03, 0.66], dark, 0.14);

  const screen_canvas = document.createElement("canvas");
  screen_canvas.width = 512;
  screen_canvas.height = 384;
  const texture = new THREE.CanvasTexture(screen_canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const glass = new THREE.MeshPhysicalMaterial({
    map: texture,
    emissiveMap: texture,
    emissive: "#96ffd9",
    emissiveIntensity: 0.65,
    roughness: 0.22,
    metalness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
  });
  const screen = new THREE.Mesh(create_tube_geometry(), glass);
  screen.position.set(-0.12, 0.03, 0.73);
  head.add(screen);

  for (const y of [0.33, 0.02]) {
    bearing(head, [0.75, y, 0.71], steel, 0.105);
    box(head, [0.025, 0.12, 0.03], [0.75, y, 0.85], dark, 0.01);
  }
  for (let i = 0; i < 7; i++) {
    box(
      head,
      [0.18, 0.018, 0.025],
      [0.75, -0.23 - i * 0.04, 0.66],
      dark,
      0.005,
    );
  }
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.027, 12, 8),
    new THREE.MeshBasicMaterial({ color: "#9bffcd" }),
  );
  lamp.position.set(0.75, -0.57, 0.68);
  head.add(lamp);
  box(head, [1.55, 0.1, 0.95], [0, -0.76, -0.12], arm.dark);
  for (const x of [-0.87, 0.87]) {
    box(head, [0.1, 0.5, 0.62], [x, -0.54, -0.12], arm.steel);
    bearing(head, [x, -0.43, 0.22], arm.brass, 0.09);
  }

  const shoulder = new THREE.Vector3(-1.35, 1.78, -0.75);
  const joints = [shoulder, new THREE.Vector3(), new THREE.Vector3()].map(() =>
    bearing(scene, [0, 0, 0], arm.brass),
  );
  const links = Array.from({ length: 4 }, (_, i) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.085, 1, 12),
      i % 2 ? arm.steel : arm.dark,
    );
    scene.add(mesh);
    return mesh;
  });
  const cable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 1, 10),
    dark,
  );
  scene.add(cable);
  return {
    head,
    shoulder,
    joints,
    links,
    cable,
    screen_canvas,
    texture,
    bracket,
    screen,
    cables: create_crt_cables(scene, head),
  };
}

// Clip the invisible native button to the moving glass silhouette, leaving
// transparent space around the TV available to the game controls.
export function crt_screen_outline(screen, camera) {
  const positions = screen.geometry.getAttribute("position");
  const point = new THREE.Vector3();
  const outline = [];
  for (let i = positions.count - 96; i < positions.count; i++) {
    point
      .fromBufferAttribute(positions, i)
      .applyMatrix4(screen.matrixWorld)
      .project(camera);
    outline.push(
      `${((point.x + 1) * 50).toFixed(2)}% ${((1 - point.y) * 50).toFixed(2)}%`,
    );
  }
  return `polygon(${outline.join(",")})`;
}

// Shift the camera's image rather than the mechanism: the stationary bracket
// touches the content's top edge, with the mechanism framed toward the left.
export function align_crt_bracket(camera, bracket, width, height) {
  camera.clearViewOffset();
  camera.updateMatrixWorld();
  const bounds = new THREE.Box3().setFromObject(bracket);
  let top = -Infinity;
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        top = Math.max(top, new THREE.Vector3(x, y, z).project(camera).y);
      }
    }
  }
  camera.setViewOffset(
    width,
    height,
    width * 0.15,
    ((1 - top) * height) / 2,
    width,
    height,
  );
}

export function dispose_crt_scene(scene) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set();
  scene.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    for (const finish of [].concat(object.material || [])) {
      materials.add(finish);
      for (const value of Object.values(finish))
        if (value?.isTexture) textures.add(value);
    }
  });
  textures.forEach((texture) => texture.dispose());
  materials.forEach((finish) => finish.dispose());
  geometries.forEach((geometry) => geometry.dispose());
}
