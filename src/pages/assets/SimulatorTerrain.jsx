import React, { Component } from "react";
import PropTypes from "prop-types";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import FractoCanvasBuffer from "@fracto/sdk/FractoCanvasBuffer.js";
import TilesBackend from "../../backend/TilesBackend.jsx";
import AppSettings from "../../AppSettings.jsx";
import AppText from "../../AppText.jsx";
import { KEY_NAVIGATOR_STRATEGY } from "../../settings/NavigatorSettings.jsx";
import { TERRAIN_TEXT } from "../../text/AssetsText.jsx";
import { terrain_mesh_data } from "./SimulatorTerrainData.js";
import { TerrainPanel, TerrainToolbar, TerrainHost, TerrainMessage } from "./SimulatorTerrainStyles.jsx";

const SAMPLE_SIZE = 129;

/** Bounded terrain preview; orbiting is independent of data loading. */
export default class SimulatorTerrain extends Component {
  static propTypes = {
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
    focal_point: PropTypes.object,
    scope: PropTypes.number,
  };
  host = React.createRef();
  sequence = 0;
  state = { status: "loading", wireframe: false };

  componentDidMount() {
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.NoToneMapping;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.host.current.appendChild(this.renderer.domElement);
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color("#17212b");
      this.camera = new THREE.PerspectiveCamera(45, 1, 0.001, 100);
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.maxPolarAngle = Math.PI / 2 - 0.01;
      this.controls.addEventListener("change", this.draw);
      this.observer = new ResizeObserver(this.resize);
      this.observer.observe(this.host.current);
      this.subscription = AppSettings.subscribe(KEY_NAVIGATOR_STRATEGY, this.schedule_load);
      this.resize();
      this.schedule_load();
    } catch (error) {
      console.error("Terrain initialization failed", error);
      this.setState({ status: "failed" });
    }
  }

  componentDidUpdate(previous) {
    if (previous.focal_point?.x !== this.props.focal_point?.x ||
      previous.focal_point?.y !== this.props.focal_point?.y || previous.scope !== this.props.scope) {
      this.schedule_load();
    }
  }

  componentWillUnmount() {
    this.sequence++;
    clearTimeout(this.timer);
    this.observer?.disconnect();
    if (this.subscription) AppSettings.unsubscribe(this.subscription);
    this.controls?.dispose();
    this.dispose_mesh();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
  }

  draw = () => {
    if (this.renderer && this.scene) this.renderer.render(this.scene, this.camera);
  };

  resize = () => {
    if (!this.renderer || !this.camera) return;
    const { clientWidth: width, clientHeight: height } = this.host.current;
    if (width <= 0 || height <= 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.draw();
  };

  dispose_mesh = () => {
    if (!this.mesh) return;
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.map.dispose();
    this.mesh.material.dispose();
    this.mesh = null;
  };

  schedule_load = () => {
    const sequence = ++this.sequence;
    clearTimeout(this.timer);
    if (!this.controls || !this.props.focal_point) return;
    this.setState({ status: "loading" });
    this.timer = setTimeout(() => this.load(sequence), 180);
  };

  load = async (sequence) => {
    const { focal_point, scope } = this.props;
    try {
      const result = await TilesBackend.canvas_buffer("canvas_buffer", {
        width_px: SAMPLE_SIZE, aspect_ratio: 1, resolution_factor: 1.5,
        focal_point_x: focal_point.x, focal_point_y: focal_point.y, scope,
        strategy: AppSettings.get(KEY_NAVIGATOR_STRATEGY) || "turbo",
      });
      if (sequence !== this.sequence) return;
      const buffer = result?.canvas_buffer;
      const data = terrain_mesh_data(buffer, scope);
      const canvas = document.createElement("canvas");
      canvas.width = buffer.length;
      canvas.height = buffer[0].length;
      FractoCanvasBuffer.buffer_to_canvas(buffer, canvas.getContext("2d"));
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
      geometry.setAttribute("uv", new THREE.BufferAttribute(data.uvs, 2));
      geometry.setIndex(data.indices);
      geometry.computeVertexNormals();
      this.dispose_mesh();
      // Preserve the 2D renderer's palette regardless of surface angle or lights.
      this.mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        map: texture, toneMapped: false, side: THREE.DoubleSide,
        wireframe: this.state.wireframe,
      }));
      this.scene.add(this.mesh);
      this.extent = Math.max(scope, data.max_height, 0.001);
      this.target_height = data.max_height / 2;
      this.set_view("oblique");
      this.setState({ status: "ready" });
    } catch (error) {
      if (sequence !== this.sequence) return;
      console.error("Terrain loading failed", error);
      this.setState({ status: "failed" });
    }
  };

  set_view = (view) => {
    if (!this.controls || !this.extent) return;
    const distance = this.extent * 1.15 / Math.min(1, this.camera.aspect);
    this.controls.target.set(0, this.target_height, 0);
    this.camera.near = Math.max(this.extent / 10000, 1e-7);
    this.camera.far = distance * 100;
    this.controls.minDistance = this.extent / 100;
    this.controls.maxDistance = distance * 10;
    this.camera.position.set(view === "top" ? 0 : distance * 0.65,
      this.target_height + distance, view === "top" ? distance * 0.001 : distance);
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.draw();
  };

  toggle_wireframe = () => this.setState(({ wireframe }) => ({ wireframe: !wireframe }), () => {
    if (this.mesh) this.mesh.material.wireframe = this.state.wireframe;
    this.draw();
  });

  render() {
    return <TerrainPanel>
      <TerrainToolbar>
        <button onClick={() => this.set_view("top")}>{AppText.get(TERRAIN_TEXT.top)}</button>
        <button onClick={() => this.set_view("oblique")}>{AppText.get(TERRAIN_TEXT.reset)}</button>
        <label><input type="checkbox" checked={this.state.wireframe} onChange={this.toggle_wireframe} />
          {AppText.get(TERRAIN_TEXT.wireframe)}</label>
        <button onClick={this.schedule_load}>{AppText.get(TERRAIN_TEXT.reload)}</button>
      </TerrainToolbar>
      <TerrainMessage aria-live="polite">{AppText.get(TERRAIN_TEXT[this.state.status])}</TerrainMessage>
      <TerrainHost ref={this.host} />
      <TerrainMessage>{AppText.get(TERRAIN_TEXT.help)}</TerrainMessage>
    </TerrainPanel>;
  }
}
