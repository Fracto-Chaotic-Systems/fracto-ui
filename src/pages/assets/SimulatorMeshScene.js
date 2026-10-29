import * as THREE from "three";
import { TERRAIN_HEIGHT_SCOPE_RATIO } from "./SimulatorTerrainData.js";

/** Reuse native geometry; instances handle placement and lower-plane reflection. */
export default class SimulatorMeshScene {
  constructor(scene, renderer, lighting) {
    Object.assign(this, { scene, renderer, lighting });
    this.cache = new Map();
    this.group = new THREE.Group();
    scene.add(this.group);
  }
  keys() {
    return [...this.cache.keys()];
  }
  install(data, wireframe) {
    const { plan, items } = data;
    this.group.clear();
    const { scope, focal_point, aspect_ratio } = plan.region;
    this.renderer.clippingPlanes = [
      new THREE.Plane(new THREE.Vector3(1, 0, 0), 0.5),
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.5),
      new THREE.Plane(new THREE.Vector3(0, 0, 1), aspect_ratio / 2),
      new THREE.Plane(new THREE.Vector3(0, 0, -1), aspect_ratio / 2),
    ];
    const tiles = new Map(plan.tiles.map((tile) => [tile.short_code, tile]));
    for (const item of items) {
      let cached = this.cache.get(item.key);
      if (!cached) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(item.positions, 3),
        );
        geometry.setAttribute("uv", new THREE.BufferAttribute(item.uvs, 2));
        geometry.setIndex(new THREE.BufferAttribute(item.indices, 1));
        const texture = new THREE.DataTexture(
          item.pixels,
          256,
          256,
          THREE.RGBAFormat,
        );
        texture.flipY = true;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = texture.magFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          toneMapped: false,
          side: THREE.DoubleSide,
        });
        this.lighting.attach(material);
        cached = { geometry, material };
        this.cache.set(item.key, cached);
      } else {
        this.cache.delete(item.key);
        this.cache.set(item.key, cached);
        if (item.pixels) cached.material.map.image.data = item.pixels;
      }
      if (item.pixels) cached.material.map.needsUpdate = true;
      cached.material.wireframe = wireframe;
      const tile = tiles.get(item.short_code),
        size = (tile.bounds.right - tile.bounds.left) / scope;
      for (const instance of tile.instances) {
        const mesh = new THREE.Mesh(cached.geometry, cached.material);
        mesh.position.set(
          (instance.bounds.left - focal_point.x) / scope,
          0,
          (focal_point.y -
            (instance.mirror_y
              ? instance.bounds.bottom
              : instance.bounds.top)) /
            scope,
        );
        mesh.scale.set(
          size,
          TERRAIN_HEIGHT_SCOPE_RATIO,
          instance.mirror_y ? -size : size,
        );
        this.group.add(mesh);
      }
    }
    const visible = new Set(items.map((item) => item.key));
    this.palette_key = data.palette_key ?? null;
    while (this.cache.size > 64) {
      const key = [...this.cache.keys()].find((key) => !visible.has(key));
      if (!key) break;
      this.evict(key);
    }
  }
  wireframe(value) {
    for (const entry of this.cache.values()) entry.material.wireframe = value;
  }
  evict(key) {
    const entry = this.cache.get(key);
    entry.geometry.dispose();
    entry.material.map.dispose();
    entry.material.dispose();
    this.cache.delete(key);
  }
  dispose() {
    this.group.clear();
    this.scene.remove(this.group);
    for (const key of this.keys()) this.evict(key);
    this.renderer.clippingPlanes = [];
  }
}
