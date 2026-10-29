import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { preview_positions } from "./MeshTilePreviewData.js";

/** Small demand-rendered scene; no animation loop or full terrain reconstruction. */
export default class MeshTilePreviewScene {
  constructor(canvas, size) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(size, size);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#17212b");
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.001, 1000);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.maxPolarAngle = Math.PI / 2 - 0.01;
    this.controls.addEventListener("change", this.draw);
    this.camera.position.set(1.4, 1.2, 1.4);
    this.controls.update();
  }
  draw = () => this.renderer.render(this.scene, this.camera);
  clear_mesh() {
    if (!this.mesh) return;
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.map.dispose();
    this.mesh.material.dispose();
    this.mesh = null;
  }
  install(data, texture_canvas, scope, multiplier) {
    const { positions, maximum_height } = preview_positions(
      data,
      scope,
      multiplier,
    );
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(data.uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
    const texture = new THREE.CanvasTexture(texture_canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    this.clear_mesh();
    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    this.scene.add(this.mesh);
    // Keep the user's viewing direction as successive tiles replace the geometry.
    const direction = this.camera.position
      .clone()
      .sub(this.controls.target)
      .normalize();
    const distance = Math.max(1, maximum_height) * 2.5;
    this.camera.far = Math.max(100, distance * 10);
    this.camera.updateProjectionMatrix();
    this.controls.target.set(0, maximum_height / 2, 0);
    this.camera.position
      .copy(this.controls.target)
      .addScaledVector(direction, distance);
    this.controls.update();
    this.draw();
  }
  dispose() {
    this.controls.dispose();
    this.clear_mesh();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
