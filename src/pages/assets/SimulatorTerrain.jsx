import React, { Component } from "react";
import PropTypes from "prop-types";
import * as THREE from "three";
import { create_navigation_controls } from "./SimulatorNavigation.js";
import AppSettings from "../../AppSettings.jsx";
import { minimum_terrain_resolution } from "./SimulatorTerrainData.js";
import {
  KEY_ASSETS_SIMULATOR_BASE_RESOLUTION,
  KEY_ASSETS_SIMULATOR_LIGHTING,
} from "../../settings/AssetsSettings.jsx";
import {
  TerrainLighting,
  normalize_terrain_lighting,
} from "./SimulatorTerrainLighting.js";
import SimulatorMeshLoader from "./SimulatorMeshLoader.js";
import SimulatorMeshScene from "./SimulatorMeshScene.js";
import SimulatorTerrainView from "./SimulatorTerrainView.jsx";
import SimulatorTerrainLod from "./SimulatorTerrainLod.js";
import { ESCAPE_RELIEF_MULTIPLIER } from "./SimulatorEscapeRelief.js";
import { flight_readings } from "./SimulatorFlightMetrics.js";
import {
  flight_region_key,
  prepare_flight_pose,
  confine_flight,
  flight_boundary_status,
} from "./SimulatorFlightRegion.js";

/** Bounded terrain preview; orbiting is independent of data loading. */
export default class SimulatorTerrain extends Component {
  static propTypes = {
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
    focal_point: PropTypes.object,
    scope: PropTypes.number,
    aspect_ratio: PropTypes.number,
  };
  host = React.createRef();
  sequence = 0;
  loader = new SimulatorMeshLoader();
  lighting = new TerrainLighting();
  state = {
    status: "loading",
    wireframe: false,
    navigation_mode: "inspect",
    flight_throttle: 0.25,
    flight_sensitivity: 1,
    flight_paused: true,
    flight_instruments: false,
    flight_readings: null,
    flight_boundary: null,
    flight_start_ready: false,
    loaded_info: null,
    progress: null,
    detail_loading: false,
    lighting: normalize_terrain_lighting(
      AppSettings.get(KEY_ASSETS_SIMULATOR_LIGHTING),
    ),
    resolution: minimum_terrain_resolution(
      AppSettings.get(KEY_ASSETS_SIMULATOR_BASE_RESOLUTION),
    ),
    resolution_input: String(
      minimum_terrain_resolution(
        AppSettings.get(KEY_ASSETS_SIMULATOR_BASE_RESOLUTION),
      ),
    ),
  };

  componentDidMount() {
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.NoToneMapping;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.host.current.appendChild(this.renderer.domElement);
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color("#17212b");
      this.terrain = new SimulatorMeshScene(
        this.scene,
        this.renderer,
        this.lighting,
      );
      this.camera = new THREE.PerspectiveCamera(45, 1, 0.001, 100);
      const canvas = this.renderer.domElement;
      canvas.tabIndex = 0;
      canvas.addEventListener("pointerdown", this.focus_canvas);
      canvas.addEventListener("focus", this.focus_flight);
      canvas.addEventListener("blur", this.stop_flight);
      canvas.addEventListener("keydown", this.flight_keydown);
      window.addEventListener("blur", this.stop_flight);
      this.replace_controls("inspect");
      this.lod = new SimulatorTerrainLod({
        camera: this.camera,
        viewport_height: () =>
          this.host.current?.clientHeight || this.props.height_px,
        on_change: this.load_detail,
        motion: this.flight_motion,
      });
      this.observer = new ResizeObserver(this.resize);
      this.observer.observe(this.host.current);
      this.resolution_subscription = AppSettings.subscribe(
        KEY_ASSETS_SIMULATOR_BASE_RESOLUTION,
        this.on_resolution_changed,
      );
      this.lighting_subscription = AppSettings.subscribe(
        KEY_ASSETS_SIMULATOR_LIGHTING,
        this.on_lighting_changed,
      );
      this.lighting.update(this.state.lighting);
      this.resize();
      this.update_controls();
      this.schedule_load();
    } catch (error) {
      console.error("Terrain initialization failed", error);
      this.setState({ status: "failed" });
    }
  }

  componentDidUpdate(previous) {
    if (
      previous.focal_point?.x !== this.props.focal_point?.x ||
      previous.focal_point?.y !== this.props.focal_point?.y ||
      previous.scope !== this.props.scope ||
      previous.aspect_ratio !== this.props.aspect_ratio
    ) {
      this.schedule_load();
    }
  }

  componentWillUnmount() {
    this.sequence++;
    clearTimeout(this.timer);
    if (this.controls_frame !== undefined)
      cancelAnimationFrame(this.controls_frame);
    this.loader.dispose();
    this.lod?.dispose();
    this.observer?.disconnect();
    if (this.resolution_subscription)
      AppSettings.unsubscribe(this.resolution_subscription);
    if (this.lighting_subscription)
      AppSettings.unsubscribe(this.lighting_subscription);
    this.controls?.dispose();
    const canvas = this.renderer?.domElement;
    canvas?.removeEventListener("pointerdown", this.focus_canvas);
    canvas?.removeEventListener("focus", this.focus_flight);
    canvas?.removeEventListener("blur", this.stop_flight);
    canvas?.removeEventListener("keydown", this.flight_keydown);
    globalThis.window?.removeEventListener("blur", this.stop_flight);
    this.terrain?.dispose();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
  }

  draw = () => {
    if (this.renderer && this.scene)
      this.renderer.render(this.scene, this.camera);
  };
  replace_controls = (mode) => {
    this.controls = create_navigation_controls(
      this.camera,
      this.renderer.domElement,
      mode,
      this.controls,
    );
    this.control_mode = mode;
    this.controls.addEventListener("change", this.on_camera_changed);
    if (mode === "fly") {
      this.controls.addEventListener("statechange", this.sync_flight_state);
      this.sync_flight_state();
    }
    this.last_controls_time = undefined;
    this.lod?.schedule();
  };
  change_navigation_mode = (event) => {
    const mode = event.target.value;
    if (!["inspect", "fly"].includes(mode) || mode === this.control_mode)
      return;
    this.replace_controls(mode);
    if (mode === "fly") this.prepare_flight_start();
    else this.setState({ flight_boundary: null });
    this.setState({ navigation_mode: mode });
    this.draw();
  };
  focus_canvas = () => {
    this.renderer.domElement.focus({ preventScroll: true });
    this.focus_flight();
  };
  flight_keydown = (event) => {
    if (this.control_mode !== "fly") return;
    if (event.code === "Escape") this.renderer.domElement.blur();
    if (event.code.startsWith("Arrow") || event.code === "Space")
      event.preventDefault();
  };
  focus_flight = () => {
    if (this.control_mode === "fly" && this.flight_ready) {
      this.prepare_flight_start();
      this.controls.enabled = true;
      this.controls.set_paused?.(false);
    }
  };
  flight_motion = () =>
    this.control_mode === "fly" &&
    this.controls?.enabled &&
    !this.controls.paused
      ? { speed: this.controls.speed || 0 }
      : null;
  sync_flight_state = () => {
    this.setState({
      flight_throttle: this.controls.throttle ?? 0.25,
      flight_sensitivity: this.controls.sensitivity ?? 1,
      flight_paused: this.controls.paused ?? true,
    });
    this.lod?.schedule();
  };
  change_throttle = (event) =>
    this.controls?.set_throttle(Number(event.target.value) / 100);
  change_sensitivity = (event) =>
    this.controls?.set_sensitivity(Number(event.target.value));
  toggle_flight_pause = () => {
    if (this.control_mode !== "fly") return;
    if (this.controls.paused || !this.controls.enabled) this.focus_canvas();
    else this.controls.set_paused(true);
  };
  stop_flight = () => {
    if (this.control_mode === "fly") this.replace_controls("fly");
  };
  prepare_flight_start = (force = false) => {
    if (!this.flight_ready || !this.flight_region || !this.camera) return;
    const key = flight_region_key(this.flight_region);
    const pose = prepare_flight_pose(
      this.camera,
      this.flight_region.aspect_ratio,
      force,
    );
    if (force || !this.flight_start || this.flight_start.key !== key)
      this.flight_start = {
        ...pose,
        key,
        distance: this.controls.inspection_distance,
      };
    this.flight_previous_position = this.camera.position.clone();
    this.setState({ flight_start_ready: true });
    this.update_flight_boundary();
  };
  update_flight_boundary = () => {
    const warning =
      this.control_mode === "fly" && this.flight_ready && this.flight_region
        ? flight_boundary_status(
            this.camera,
            this.controls?.speed || 0,
            this.flight_region.aspect_ratio,
          )
        : null;
    if (warning !== this.state.flight_boundary)
      this.setState({ flight_boundary: warning });
  };
  return_to_start = () => {
    if (
      this.control_mode !== "fly" ||
      !this.flight_ready ||
      !this.flight_start ||
      !this.flight_region ||
      this.flight_start.key !== flight_region_key(this.flight_region)
    )
      return;
    this.stop_flight();
    this.camera.position.copy(this.flight_start.position);
    this.camera.quaternion.copy(this.flight_start.quaternion);
    this.camera.up.copy(this.flight_start.up);
    this.controls.inspection_distance = this.flight_start.distance;
    this.flight_previous_position = this.camera.position.clone();
    this.on_camera_changed();
    this.update_flight_readings();
  };
  update_flight_readings = () => {
    if (!this.state.flight_instruments || !this.camera) return;
    this.setState({
      flight_readings: flight_readings(
        this.camera,
        this.controls?.speed || 0,
        this.terrain?.region?.scope ?? this.props.scope,
        this.terrain?.height_at?.(
          this.camera.position.x,
          this.camera.position.z,
        ) ?? null,
      ),
    });
  };
  toggle_flight_instruments = (event) =>
    this.setState(
      { flight_instruments: event.target.checked },
      this.update_flight_readings,
    );
  // Both controllers use change events; free flight additionally needs elapsed seconds.
  update_controls = (time) => {
    const delta =
      this.last_controls_time === undefined || time === undefined
        ? 0
        : Math.min((time - this.last_controls_time) / 1000, 0.05);
    this.last_controls_time = time;
    this.controls?.update(delta);
    if (
      this.state.flight_instruments &&
      this.control_mode === "fly" &&
      (this.last_readings_time === undefined ||
        time - this.last_readings_time >= 250)
    ) {
      this.last_readings_time = time;
      this.update_flight_readings();
    }
    this.controls_frame = requestAnimationFrame(this.update_controls);
  };
  on_camera_changed = () => {
    if (
      this.control_mode === "fly" &&
      this.flight_ready &&
      this.flight_region
    ) {
      if (
        confine_flight(
          this.flight_previous_position || this.camera.position,
          this.camera.position,
          this.flight_region.aspect_ratio,
        )
      )
        this.controls.set_paused?.(true);
      this.flight_previous_position = this.camera.position.clone();
      this.update_flight_boundary();
    }
    this.draw();
    this.lod?.schedule();
  };

  resize = () => {
    if (!this.renderer || !this.camera) return;
    const { clientWidth: width, clientHeight: height } = this.host.current;
    if (width <= 0 || height <= 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.controls?.handleResize?.();
    this.draw();
    this.lod?.schedule();
  };

  schedule_load = () => {
    const sequence = ++this.sequence;
    clearTimeout(this.timer);
    this.loader.cancel();
    this.lod?.reset();
    this.flight_ready = false;
    this.stop_flight();
    if (!this.controls || !this.props.focal_point) return;
    this.setState({
      status: "loading",
      loaded_info: null,
      progress: { stage: "loading", value: null },
      detail_loading: false,
      flight_boundary: null,
      flight_start_ready: false,
    });
    this.timer = setTimeout(() => this.load(sequence), 180);
  };

  load = async (sequence) => {
    const { focal_point, scope, aspect_ratio = 1 } = this.props;
    try {
      const data = await this.loader.load(
        {
          focal_point_x: focal_point.x,
          focal_point_y: focal_point.y,
          scope,
          aspect_ratio,
          minimum_resolution: this.state.resolution,
        },
        this.terrain.keys(),
        (progress) => {
          if (sequence === this.sequence) this.setState({ progress });
        },
        this.terrain.palette_key,
        {
          texture_keys: this.terrain.texture_keys?.() || {},
          escape_scale: ESCAPE_RELIEF_MULTIPLIER,
        },
      );
      if (sequence !== this.sequence) return;
      this.terrain.install(data, this.state.wireframe);
      const region_changed =
        !this.flight_region ||
        flight_region_key(this.flight_region) !==
          flight_region_key(data.plan.region);
      this.flight_region = data.plan.region;
      this.flight_ready = Boolean(data.items.length);
      if (region_changed) this.flight_start = null;
      if (region_changed || !this.flight_ready) this.stop_flight();
      this.extent = Math.max(1, aspect_ratio);
      this.target_height = data.maximum_height / 50;
      if (!this.has_terrain || this.view_aspect !== aspect_ratio)
        this.set_view("oblique");
      else this.draw();
      if (this.control_mode === "fly") {
        this.prepare_flight_start(region_changed);
        this.draw();
      }
      this.has_terrain = Boolean(data.items.length);
      this.view_aspect = aspect_ratio;
      this.lod?.set_plan(data.plan);
      this.setState({
        status: data.items.length
          ? "ready"
          : (data.plan.base_tiles || data.plan.tiles).length
            ? "failed"
            : "empty",
        loaded_info: data,
        progress: null,
        flight_start_ready: Boolean(this.flight_ready && this.flight_start),
        ...(!this.flight_ready ? { flight_boundary: null } : {}),
      });
    } catch (error) {
      if (sequence !== this.sequence || error.name === "AbortError") return;
      console.error("Cached terrain loading failed", error);
      this.setState({ status: "failed", progress: null });
    }
  };

  load_detail = async (plan) => {
    const sequence = this.sequence;
    this.setState({ detail_loading: true });
    try {
      const data = await this.loader.load(
        null,
        this.terrain.keys(),
        null,
        this.terrain.palette_key,
        {
          plan,
          texture_keys: this.terrain.texture_keys(),
          escape_scale: ESCAPE_RELIEF_MULTIPLIER,
        },
      );
      if (sequence !== this.sequence) return null;
      this.terrain.install(data, this.state.wireframe);
      this.target_height = data.maximum_height / 50;
      this.draw();
      this.setState({
        loaded_info: data,
        detail_loading: false,
        status: data.items.length
          ? "ready"
          : (data.plan.base_tiles || data.plan.tiles).length
            ? "failed"
            : "empty",
      });
      return data.plan;
    } catch (error) {
      if (sequence === this.sequence) this.setState({ detail_loading: false });
      if (error.name !== "AbortError")
        console.error("Nearby terrain unavailable", error);
      return { refined_groups: [...(this.lod?.current || [])] };
    }
  };

  on_resolution_changed = (_key, value) =>
    this.setState(
      {
        resolution: minimum_terrain_resolution(value),
        resolution_input: String(minimum_terrain_resolution(value)),
      },
      this.schedule_load,
    );

  on_lighting_changed = (_key, value) =>
    this.setState({ lighting: normalize_terrain_lighting(value) }, () => {
      this.lighting.update(this.state.lighting);
      this.draw();
    });

  change_lighting = (key, value) =>
    AppSettings.on_settings_changed({
      [KEY_ASSETS_SIMULATOR_LIGHTING]: normalize_terrain_lighting({
        ...this.state.lighting,
        [key]: value,
      }),
    });

  change_resolution = (event) =>
    this.setState({ resolution_input: event.target.value });
  apply_resolution = (event) => {
    event.preventDefault();
    const value = Number(this.state.resolution_input);
    if (!Number.isSafeInteger(value) || value < 2 || value > 5000) return;
    AppSettings.on_settings_changed({
      [KEY_ASSETS_SIMULATOR_BASE_RESOLUTION]: value,
    });
  };

  set_view = (view) => {
    if (!this.controls || !this.extent) return;
    const distance = (this.extent * 1.15) / Math.min(1, this.camera.aspect);
    const target = new THREE.Vector3(0, this.target_height, 0);
    this.camera.up.set(0, 1, 0);
    this.camera.near = Math.max(this.extent / 10000, 1e-7);
    this.camera.far = distance * 100;
    this.controls.minDistance = this.extent / 100;
    this.controls.maxDistance = distance * 10;
    this.camera.position.set(
      view === "top" ? 0 : distance * 0.65,
      this.target_height + distance,
      view === "top" ? distance * 0.001 : distance,
    );
    this.camera.lookAt(target);
    this.controls.target?.copy(target);
    this.camera.updateProjectionMatrix();
    if (this.control_mode === "fly") {
      this.controls.inspection_distance =
        this.camera.position.distanceTo(target);
      this.replace_controls("fly");
    }
    this.controls.update(0);
    if (this.control_mode === "fly") this.prepare_flight_start();
    this.draw();
  };

  toggle_wireframe = () =>
    this.setState(
      ({ wireframe }) => ({ wireframe: !wireframe }),
      () => {
        this.terrain?.wireframe(this.state.wireframe);
        this.draw();
      },
    );

  render() {
    return (
      <SimulatorTerrainView
        {...this.state}
        host={this.host}
        on_resolution_change={this.change_resolution}
        on_resolution_apply={this.apply_resolution}
        on_view={this.set_view}
        on_wireframe={this.toggle_wireframe}
        on_reload={this.schedule_load}
        on_lighting={this.change_lighting}
        on_navigation_mode={this.change_navigation_mode}
        on_throttle={this.change_throttle}
        on_sensitivity={this.change_sensitivity}
        on_flight_pause={this.toggle_flight_pause}
        on_flight_instruments={this.toggle_flight_instruments}
        on_return_to_start={this.return_to_start}
      />
    );
  }
}
