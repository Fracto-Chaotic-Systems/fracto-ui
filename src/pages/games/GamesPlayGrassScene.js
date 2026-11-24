import * as THREE from "three";
import { create_component_content } from "./ComponentStageContent.js";
import { update_component_lighting } from "./ComponentStageLighting.js";
import {
  configure_component_shadows,
  fit_component_shadows,
} from "./ComponentStageShadows.js";
import { play_grass_view } from "./GamesPlayGrassView.js";
import { create_path_motion_controller } from "@fracto/sdk/FractoPathMotion.js";
import { apply_top_down_path_pose } from "../../utils/render/TopDownPathCamera.js";

export function create_play_grass_scene(host, { on_error, path_motion }) {
  const motion = create_path_motion_controller(path_motion);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.style.display = "block";
  host.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x554e36);
  const light = new THREE.DirectionalLight(0xfff4e5, 3);
  configure_component_shadows(renderer, light);
  scene.add(
    new THREE.HemisphereLight(0xffffff, 0x657565, 2),
    light,
    light.target,
  );
  const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.001, 100);
  camera.up.set(0, 0, -1);
  let component = null,
    content = null,
    frame = null,
    last_time = null;
  let disposed = false,
    failed = false,
    width = 1,
    height = 1,
    shadow_root = null,
    shadow_bounds = null,
    ready = false;
  const stop = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    last_time = null;
  };
  const fail = () => {
    if (disposed) return;
    failed = true;
    stop();
    on_error();
  };
  const render = () => {
    if (disposed || failed || document.hidden || !component) return;
    if (shadow_root !== content.root) {
      shadow_bounds = new THREE.Box3().setFromObject(content.root);
      shadow_root = content.root;
    }
    fit_component_shadows(
      light,
      content.root,
      component,
      camera,
      shadow_bounds,
    );
    renderer.render(scene, camera);
    if (ready && frame === null) frame = requestAnimationFrame(tick);
  };
  const tick = (time) => {
    frame = null;
    if (disposed || failed || document.hidden) return;
    if (last_time !== null) {
      const delta = (time - last_time) / 1000;
      content.animate(Math.min(delta, 0.1));
      apply_top_down_path_pose(camera, motion.advance(delta));
    }
    last_time = time;
    render();
  };
  content = create_component_content({
    scene,
    render,
    on_status: (status) => {
      if (status === "loading_content") {
        ready = false;
        stop();
      } else if (status === "content_ready") {
        ready = true;
        render();
      } else fail();
    },
  });
  const resize = (next_width, next_height) => {
    width = Math.max(next_width, 1);
    height = Math.max(next_height, 1);
    renderer.setSize(width, height, false);
    if (!component) return;
    const view = play_grass_view(component.floor, width, height);
    camera.left = -view.width / 2;
    camera.right = view.width / 2;
    camera.top = view.height / 2;
    camera.bottom = -view.height / 2;
    camera.updateProjectionMatrix();
    apply_top_down_path_pose(camera, motion.pose);
    shadow_root = null;
    render();
  };
  const visibility_changed = () => {
    stop();
    if (!document.hidden) render();
  };
  const context_lost = (event) => {
    event.preventDefault();
    fail();
  };
  document.addEventListener("visibilitychange", visibility_changed);
  renderer.domElement.addEventListener("webglcontextlost", context_lost);
  return {
    resize,
    seek_motion(seconds) {
      const pose = motion.reset(seconds);
      apply_top_down_path_pose(camera, pose);
      last_time = null;
      render();
      return pose;
    },
    async update(document) {
      if (disposed) return;
      if (!document.floor) throw new Error("component_floor_required");
      const radius = (Math.min(...document.floor.size) * 0.97) / 2;
      if (
        path_motion.points.some(
          ([x, y, z]) =>
            y !== 0 ||
            Math.abs(x) + radius > document.floor.size[0] / 2 ||
            Math.abs(z) + radius > document.floor.size[1] / 2,
        )
      )
        throw new Error("path_motion_outside_floor");
      component = document;
      update_component_lighting(light, document);
      resize(width, height);
      await content.update(document);
      if (!disposed) {
        shadow_root = null;
        render();
      }
    },
    dispose() {
      disposed = true;
      stop();
      document.removeEventListener("visibilitychange", visibility_changed);
      renderer.domElement.removeEventListener("webglcontextlost", context_lost);
      content.dispose();
      light.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
