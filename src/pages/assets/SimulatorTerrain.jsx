import React, { Component } from "react";
import PropTypes from "prop-types";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import TilesBackend from "../../backend/TilesBackend.jsx";
import AppSettings from "../../AppSettings.jsx";
import AppText from "../../AppText.jsx";
import { KEY_NAVIGATOR_STRATEGY } from "../../settings/NavigatorSettings.jsx";
import { TERRAIN_TEXT } from "../../text/AssetsText.jsx";
import { TERRAIN_PREVIEW_SIZE, TERRAIN_RESOLUTIONS, terrain_resolution } from "./SimulatorTerrainData.js";
import { KEY_ASSETS_SIMULATOR_RESOLUTION } from "../../settings/AssetsSettings.jsx";
import SimulatorTerrainLoader from "./SimulatorTerrainLoader.js";
import { TerrainPanel, TerrainToolbar, TerrainHost, TerrainMessage } from "./SimulatorTerrainStyles.jsx";

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
  loader = new SimulatorTerrainLoader();
  state = { status: "loading", wireframe: false, loaded_size: null,
    resolution: terrain_resolution(AppSettings.get(KEY_ASSETS_SIMULATOR_RESOLUTION)) };

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
      this.resolution_subscription = AppSettings.subscribe(KEY_ASSETS_SIMULATOR_RESOLUTION, this.on_resolution_changed);
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
    this.loader.cancel();
    this.observer?.disconnect();
    if (this.subscription) AppSettings.unsubscribe(this.subscription);
    if (this.resolution_subscription) AppSettings.unsubscribe(this.resolution_subscription);
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
    this.loader.cancel();
    if (!this.controls || !this.props.focal_point) return;
    this.setState({ status: "loading", loaded_size: null });
    this.timer = setTimeout(() => this.load(sequence), 180);
  };

  load = async (sequence) => {
    const { focal_point, scope } = this.props;
    const resolution = this.state.resolution;
    const strategy = AppSettings.get(KEY_NAVIGATOR_STRATEGY) || "turbo";
    let preview_ready = false;
    try {
      for (const size of resolution === TERRAIN_PREVIEW_SIZE ? [resolution] : [TERRAIN_PREVIEW_SIZE, resolution]) {
        const url = TilesBackend.canvas_buffer_url("canvas_buffer", {
          width_px: size, aspect_ratio: 1, resolution_factor: 1.5,
          focal_point_x: focal_point.x, focal_point_y: focal_point.y, scope, strategy,
        });
        const data = await this.loader.load({ url, scope });
        if (sequence !== this.sequence) return;
        this.install_mesh(data, scope, !preview_ready);
        preview_ready = true;
        this.setState({ status: size === resolution ? "ready" : "refining", loaded_size: size });
      }
    } catch (error) {
      if (sequence !== this.sequence || error.name === "AbortError") return;
      console.error("Terrain loading failed", error);
      this.setState({ status: preview_ready ? "detail_failed" : "failed" });
    }
  };

  install_mesh = (data, scope, fit_view) => {
      const texture = new THREE.DataTexture(data.pixels, data.width, data.height, THREE.RGBAFormat);
      // Worker image data has the same top-down order as the old canvas texture.
      texture.flipY = true;
      texture.needsUpdate = true;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
      geometry.setAttribute("uv", new THREE.BufferAttribute(data.uvs, 2));
      geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
      this.dispose_mesh();
      // Preserve the 2D renderer's palette regardless of surface angle or lights.
      this.mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        map: texture, toneMapped: false, side: THREE.DoubleSide,
        wireframe: this.state.wireframe,
      }));
      this.scene.add(this.mesh);
      this.extent = Math.max(scope, data.max_height, 0.001);
      this.target_height = data.max_height / 2;
      if (fit_view) this.set_view("oblique");
      else this.draw();
  };

  on_resolution_changed = (_key, value) => this.setState({ resolution: terrain_resolution(value) }, this.schedule_load);

  change_resolution = (event) => AppSettings.on_settings_changed({
    [KEY_ASSETS_SIMULATOR_RESOLUTION]: terrain_resolution(Number(event.target.value)),
  });

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
        <label>{AppText.get(TERRAIN_TEXT.resolution)}
          <select value={this.state.resolution} onChange={this.change_resolution}>
            {TERRAIN_RESOLUTIONS.map((size) => <option key={size} value={size}>{size} × {size}</option>)}
          </select>
        </label>
        <button onClick={() => this.set_view("top")}>{AppText.get(TERRAIN_TEXT.top)}</button>
        <button onClick={() => this.set_view("oblique")}>{AppText.get(TERRAIN_TEXT.reset)}</button>
        <label><input type="checkbox" checked={this.state.wireframe} onChange={this.toggle_wireframe} />
          {AppText.get(TERRAIN_TEXT.wireframe)}</label>
        <button onClick={this.schedule_load}>{AppText.get(TERRAIN_TEXT.reload)}</button>
      </TerrainToolbar>
      <TerrainMessage aria-live="polite">{AppText.get(TERRAIN_TEXT[this.state.status])}
        {this.state.loaded_size && ` · ${this.state.loaded_size} × ${this.state.loaded_size}`}
      </TerrainMessage>
      <TerrainHost ref={this.host} />
      <TerrainMessage>{AppText.get(TERRAIN_TEXT.help)}</TerrainMessage>
    </TerrainPanel>;
  }
}
