import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { create_component_content } from "./ComponentStageContent.js";
import { update_component_lighting } from "./ComponentStageLighting.js";
import {
  configure_component_shadows,
  fit_component_shadows,
} from "./ComponentStageShadows.js";
import {
  WALK_SETTINGS,
  create_floor_probe,
  create_walk_controller,
  walk_spawn,
} from "./ComponentStageWalk.js";

// Stage guides are editor furniture, separate from future authored floor/objects.
export function create_component_stage(
  host,
  { label, on_error, on_status, on_select, on_walk, on_info },
) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-label", label);
  canvas.setAttribute("role", "img");
  canvas.tabIndex = 0;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8eef0);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000000);
  const controls = new OrbitControls(camera, canvas);
  controls.minDistance = 0.02;
  controls.maxDistance = 50000;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.listenToKeyEvents(canvas);
  const grid = new THREE.GridHelper(20, 20, 0x718780, 0xb1bcb5);
  const origin = new THREE.AxesHelper(2);
  scene.add(grid, origin);
  const sunlight = new THREE.DirectionalLight(0xfff4e5, 3);
  const skylight = new THREE.HemisphereLight(0xffffff, 0x657565, 2);
  configure_component_shadows(renderer, sunlight);
  update_component_lighting(sunlight, {}, skylight);
  scene.add(skylight, sunlight, sunlight.target);
  const selection_box = new THREE.Box3(),
    highlight = new THREE.Box3Helper(selection_box, 0xe29a23);
  highlight.visible = false;
  scene.add(highlight);
  let selected = null,
    lighting_document = {},
    shadow_view = null,
    lighting_generation = 0,
    content = null;
  let disposed = false,
    context_failed = false,
    frame = null,
    last_frame = null,
    suspended = false,
    walk = null,
    orbit_view = null;
  // Preview-only view settings shared with the materials preview: play/pause
  // animation and a display scale. Neither changes the document.
  let preview = { scale: 1, animation: true };
  const animating = () => Boolean(content?.animated && preview.animation);
  const looping = () => Boolean(animating() || walk?.active);
  const stop_animation = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    last_frame = null;
  };
  const start_animation = () => {
    if (
      disposed ||
      suspended ||
      context_failed ||
      document.hidden ||
      !looping()
    ) {
      stop_animation();
      return;
    }
    if (frame !== null) return;
    frame = requestAnimationFrame((time) => {
      frame = null;
      if (
        disposed ||
        suspended ||
        context_failed ||
        document.hidden ||
        !looping()
      )
        return;
      if (last_frame !== null) {
        const dt = Math.min((time - last_frame) / 1000, 0.1);
        walk.update(Math.min(dt, 0.05));
        if (animating()) content.animate(dt, camera, canvas.height);
      }
      last_frame = time;
      render();
    });
  };
  const render = () => {
    if (disposed || suspended) return;
    camera.updateMatrixWorld();
    // The content root can be replaced by updates, so apply the scale here.
    if (content && content.root.scale.x !== preview.scale)
      content.root.scale.setScalar(preview.scale);
    if (content) {
      const view = [
        content.root.uuid,
        lighting_document.lighting?.direction_degrees ?? 45,
        ...camera.matrixWorld.elements,
        ...camera.projectionMatrix.elements,
      ].join(",");
      if (view !== shadow_view) {
        fit_component_shadows(
          sunlight,
          content.root,
          lighting_document,
          camera,
        );
        shadow_view = view;
      }
    }
    selection_box.makeEmpty();
    if (selected && content && !walk?.active)
      for (const child of content.root.children)
        if (child.userData.component_item_id === selected)
          selection_box.expandByObject(child);
    highlight.visible = !selection_box.isEmpty();
    if (!disposed) renderer.render(scene, camera);
    start_animation();
  };
  content = create_component_content({ scene, render, on_status });
  /** Reports whether the content animates and its unscaled height (metres). */
  const report = () => {
    if (disposed || !content) return;
    const bounds = new THREE.Box3().setFromObject(content.root);
    const scale = content.root.scale.x || 1;
    on_info?.({
      animated: Boolean(content.animated),
      height: bounds.isEmpty()
        ? 0
        : bounds.getSize(new THREE.Vector3()).y / scale,
    });
  };
  walk = create_walk_controller({
    camera,
    canvas,
    ground: create_floor_probe(() => content.root),
    on_change: (status) => {
      on_walk?.(status);
      start_animation();
    },
  });
  const set_walking = (value) => {
    if (value === walk.active || context_failed) return;
    if (value) {
      orbit_view = {
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
        target: controls.target.clone(),
      };
      const bounds = new THREE.Box3().setFromObject(content.root);
      const center = bounds.isEmpty()
        ? new THREE.Vector3()
        : bounds.getCenter(new THREE.Vector3());
      const size = bounds.isEmpty()
        ? new THREE.Vector3(20, 0, 20)
        : bounds.getSize(new THREE.Vector3());
      controls.enabled = false;
      grid.visible = origin.visible = false;
      camera.fov = WALK_SETTINGS.field_of_view;
      camera.updateProjectionMatrix();
      walk.enter(
        walk_spawn(
          [center.x, 0, center.z],
          Math.hypot(size.x, size.z) / 2,
          camera.position.toArray(),
        ),
      );
    } else {
      walk.exit();
      camera.fov = 45;
      camera.updateProjectionMatrix();
      if (orbit_view) {
        camera.position.copy(orbit_view.position);
        camera.quaternion.copy(orbit_view.quaternion);
        controls.target.copy(orbit_view.target);
      }
      controls.enabled = true;
      grid.visible = origin.visible = true;
      controls.update();
    }
    render();
  };
  const reset_camera = () => {
    if (walk.active) set_walking(false);
    const bounds = new THREE.Box3().setFromObject(content.root);
    if (bounds.isEmpty()) {
      camera.position.set(16, 12, 16);
      controls.target.set(0, 0, 0);
    } else {
      const sphere = bounds.getBoundingSphere(new THREE.Sphere());
      controls.target.copy(sphere.center);
      camera.position
        .copy(sphere.center)
        .add(
          new THREE.Vector3(1, 0.75, 1)
            .normalize()
            .multiplyScalar(
              Math.max(sphere.radius, 0.1) *
                3.5 *
                Math.max(1, 1 / camera.aspect),
            ),
        );
    }
    controls.update();
    render();
  };
  const resize = () => {
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  };
  const context_lost = (event) => {
    event.preventDefault();
    context_failed = true;
    stop_animation();
    on_error();
  };
  const observer = new ResizeObserver(resize);
  let pointer_start = null;
  const pointer_down = (event) => {
    pointer_start = [event.clientX, event.clientY];
  };
  const pointer_up = (event) => {
    if (
      walk.active ||
      !pointer_start ||
      event.button !== 0 ||
      Math.hypot(
        event.clientX - pointer_start[0],
        event.clientY - pointer_start[1],
      ) > 4
    )
      return;
    const rect = canvas.getBoundingClientRect(),
      ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((event.clientY - rect.top) / rect.height) * 2,
      ),
      camera,
    );
    let node = ray.intersectObject(content.root, true)[0]?.object;
    while (node && !node.userData.component_item_id) node = node.parent;
    on_select?.(node?.userData.component_item_id || "");
  };
  controls.addEventListener("change", render);
  const visibility_changed = () => {
    stop_animation();
    start_animation();
  };
  document.addEventListener("visibilitychange", visibility_changed);
  canvas.addEventListener("webglcontextlost", context_lost);
  canvas.addEventListener("pointerdown", pointer_down);
  canvas.addEventListener("pointerup", pointer_up);
  host.prepend(canvas);
  observer.observe(host);
  reset_camera();
  resize();
  return {
    reset_camera,
    set_walking,
    set_visible(value) {
      if (!value) set_walking(false);
      suspended = !value;
      if (suspended) stop_animation();
      else resize();
    },
    async update_document(document, options) {
      const token = ++lighting_generation;
      lighting_document = document;
      shadow_view = null;
      update_component_lighting(sunlight, document, skylight);
      await content.update(document, options);
      if (disposed || token !== lighting_generation) return;
      render();
      report();
    },
    set_preview(next) {
      preview = { ...preview, ...next };
      shadow_view = null;
      stop_animation();
      render();
      report();
    },
    select(id) {
      selected = id;
      render();
    },
    dispose() {
      disposed = true;
      stop_animation();
      document.removeEventListener("visibilitychange", visibility_changed);
      observer.disconnect();
      controls.removeEventListener("change", render);
      controls.dispose();
      walk.dispose();
      content.dispose();
      sunlight.shadow.dispose();
      highlight.geometry.dispose();
      highlight.material.dispose();
      canvas.removeEventListener("webglcontextlost", context_lost);
      canvas.removeEventListener("pointerdown", pointer_down);
      canvas.removeEventListener("pointerup", pointer_up);
      for (const guide of [grid, origin]) {
        guide.geometry.dispose();
        for (const material of [guide.material].flat()) material.dispose();
      }
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
