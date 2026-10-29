import * as THREE from "three";
import {
  TERRAIN_VERTEX_EDGE,
  terrain_boundary_data,
} from "./SimulatorTerrainEdges.js";
import { weld_terrain_edges } from "./SimulatorTerrainTransitions.js";

const WIDTH = 4 * TERRAIN_VERTEX_EDGE;
const DISPLACE = `
  #include <begin_vertex>
  float weldIndex = -1.0;
  if (position.z == 0.0) weldIndex = floor(position.x * 256.0 + 0.5);
  else if (position.x == 1.0) weldIndex = 257.0 + floor(position.z * 256.0 + 0.5);
  else if (position.z == 1.0) weldIndex = 514.0 + floor(position.x * 256.0 + 0.5);
  else if (position.x == 0.0) weldIndex = 771.0 + floor(position.z * 256.0 + 0.5);
  if (weldIndex >= 0.0) {
    vec2 weldedEdge = texture2D(fractoWeldEdges, vec2((weldIndex + 0.5) / 1028.0, 0.5)).rg;
    transformed.y = weldedEdge.r;
    if (position.z == 0.0 || position.z == 1.0) transformed.x = weldedEdge.g;
    else transformed.z = weldedEdge.g;
  }
`;

/** Per-placement edge overrides keep shared cached positions and stored files immutable. */
export default class SimulatorTerrainWelding {
  boundaries = new WeakMap();
  sources = new WeakMap();
  overlays = new Map();
  apply(meshes) {
    const placements = [];
    for (const mesh of meshes) {
      if (!this.sources.has(mesh))
        this.sources.set(mesh, {
          material: mesh.material,
          sphere: mesh.boundingSphere,
        });
      const source = this.sources.get(mesh);
      mesh.material = source.material;
      if (source.sphere === undefined) delete mesh.boundingSphere;
      else mesh.boundingSphere = source.sphere;
      const code = mesh.userData.short_code;
      if (!/^[0-3]{2,34}$/.test(code || "")) continue;
      if (!this.boundaries.has(mesh.geometry))
        this.boundaries.set(
          mesh.geometry,
          terrain_boundary_data(
            mesh.geometry.getAttribute("position").array,
            mesh.geometry.index?.array || [],
          ),
        );
      const boundary = this.boundaries.get(mesh.geometry);
      if (boundary)
        placements.push({
          mesh,
          source: source.material,
          boundary,
          short_code: code,
          mirror_y: mesh.userData.mirror_y,
        });
    }
    const used = new Set();
    for (const patch of weld_terrain_edges(placements)) {
      if (!patch.changed) continue;
      const key = `${patch.mesh.geometry.uuid}/${patch.level}/${patch.column}/${patch.row}`;
      const edges = new Float32Array(WIDTH * 2);
      for (let i = 0; i < WIDTH; i++) {
        edges[i * 2] = patch.heights[i];
        edges[i * 2 + 1] =
          patch.coordinates?.[i] ??
          (i % TERRAIN_VERTEX_EDGE) / (TERRAIN_VERTEX_EDGE - 1);
      }
      let overlay = this.overlays.get(key);
      if (!overlay) {
        const texture = new THREE.DataTexture(
          edges,
          WIDTH,
          1,
          THREE.RGFormat,
          THREE.FloatType,
        );
        texture.minFilter = texture.magFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        texture.needsUpdate = true;
        const source = patch.source;
        const material = source.clone(),
          compile = source.onBeforeCompile;
        material.customProgramCacheKey = () =>
          `${source.customProgramCacheKey()}|terrain-edge-weld-v2`;
        material.onBeforeCompile = (shader, renderer) => {
          compile.call(source, shader, renderer);
          shader.uniforms.fractoWeldEdges = { value: texture };
          shader.vertexShader =
            `uniform sampler2D fractoWeldEdges;\n${shader.vertexShader}`.replace(
              "#include <begin_vertex>",
              DISPLACE,
            );
        };
        overlay = { texture, material };
        this.overlays.set(key, overlay);
      } else if (
        edges.some(
          (height, index) => height !== overlay.texture.image.data[index],
        )
      ) {
        overlay.texture.image.data.set(edges);
        overlay.texture.needsUpdate = true;
      }
      overlay.material.wireframe = patch.source.wireframe;
      patch.mesh.material = overlay.material;
      // Shader-adjusted heights stay inside the original unit cube, even on otherwise-flat tiles.
      patch.mesh.boundingSphere = new THREE.Sphere(
        new THREE.Vector3(0.5, 0.5, 0.5),
        Math.sqrt(3) / 2,
      );
      used.add(key);
    }
    for (const [key, overlay] of this.overlays)
      if (!used.has(key)) {
        overlay.texture.dispose();
        overlay.material.dispose();
        this.overlays.delete(key);
      }
  }
  wireframe(value) {
    for (const overlay of this.overlays.values())
      overlay.material.wireframe = value;
  }
  dispose() {
    for (const overlay of this.overlays.values()) {
      overlay.texture.dispose();
      overlay.material.dispose();
    }
    this.overlays.clear();
  }
}
