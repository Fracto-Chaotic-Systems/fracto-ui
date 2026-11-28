import { create_inventory_animation } from "./InventoryAnimation.js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { load_inventory_model } from "./InventoryModelLoader.js";
import { create_material_effects } from "./effects/MaterialEffects.js";
import { create_grass_density } from "./InventoryGrassDensity.js";
import { repair_fbx_cutouts } from "./InventoryMaterialPreview.js";
import {
  inventory_camera_position,
  inventory_camera_target,
} from "./InventoryCamera.js";

export const DEFAULT_INVENTORY_PREVIEW = {
  scale: 1,
  lighting: 45,
  strength: 3,
  normal: true,
  roughness: true,
  wireframe: false,
  reference: false,
  density: 1,
  animation: true,
  // "saved" uses each fire's cardinality from asset.json; a supported
  // cardinality previews that orbital pattern's flame color instead.
  flame_cardinality: "saved",
};

function dispose_tree(root) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set();
  root.traverse((node) => {
    if (node.isInstancedMesh) node.dispose();
    if (node.geometry) geometries.add(node.geometry);
    for (const material of [node.material].flat().filter(Boolean)) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) textures.add(value);
      }
      for (const value of Object.values(
        material.userData.inventory_maps || {},
      )) {
        if (value?.isTexture) textures.add(value);
      }
    }
  });
  geometries.forEach((item) => item.dispose());
  materials.forEach((item) => item.dispose());
  textures.forEach((item) => {
    item.source?.data?.close?.();
    item.dispose();
  });
}

export function create_inventory_scene(
  host,
  { label, asset, on_status, on_info },
) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-label", label);
  canvas.setAttribute("role", "img");
  canvas.tabIndex = 0;
  host.prepend(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8eef0);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.minDistance = 0.15;
  controls.maxDistance = 15;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.listenToKeyEvents(canvas);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x64715b, 2);
  const light = new THREE.DirectionalLight(0xfff1dd, 3);
  scene.add(hemi, light);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({ color: 0xd2d9d2, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.005;
  scene.add(ground, new THREE.GridHelper(6, 60, 0x718780, 0xb1bcb5));
  const reference = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    new THREE.LineBasicMaterial({ color: 0x487f9a }),
  );
  reference.position.set(1.35, 0.5, 0);
  scene.add(reference);
  const ruler_points = [
    new THREE.Vector3(-0.8, 0, 0),
    new THREE.Vector3(-0.8, 1, 0),
  ];
  for (let i = 0; i <= 10; i++) {
    ruler_points.push(
      new THREE.Vector3(-0.8, i / 10, 0),
      new THREE.Vector3(-0.8 + (i % 5 ? 0.06 : 0.12), i / 10, 0),
    );
  }
  const ruler = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(ruler_points),
    new THREE.LineBasicMaterial({ color: 0x3f5155 }),
  );
  scene.add(ruler);
  let disposed = false,
    context_failed = false,
    model = null,
    animation = null,
    effects = null,
    frame = null,
    last_frame = null,
    extent = 1,
    model_height = 1,
    model_size = new THREE.Vector3(1, 1, 1),
    density = null,
    density_count = null,
    model_info = null,
    options = { ...DEFAULT_INVENTORY_PREVIEW };
  const render = () => {
    if (!disposed) renderer.render(scene, camera);
  };
  const stop_animation = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    last_frame = null;
  };
  const start_animation = () => {
    if (
      disposed ||
      context_failed ||
      !(animation?.count || effects?.count) ||
      !options.animation ||
      document.hidden ||
      frame !== null
    )
      return;
    const tick = (time) => {
      frame = null;
      if (disposed || !options.animation || document.hidden) return;
      if (last_frame !== null) {
        const delta = Math.min((time - last_frame) / 1000, 0.1);
        if (animation?.count) animation.update(delta);
        effects?.update(delta, camera, canvas.height);
      }
      last_frame = time;
      render();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  };
  const visibility_changed = () => {
    stop_animation();
    start_animation();
  };
  document.addEventListener("visibilitychange", visibility_changed);
  controls.addEventListener("change", render);
  const reset_camera = () => {
    const size = model_size.clone().multiplyScalar(options.scale);
    controls.target.copy(inventory_camera_target(size, options.reference));
    camera.position.copy(
      inventory_camera_position(
        size,
        controls.target,
        camera.aspect,
        camera.fov,
        options.reference,
      ),
    );
    const distance = camera.position.distanceTo(controls.target);
    controls.minDistance = Math.max(0.000001, distance * 0.05);
    camera.near = Math.max(0.000001, Math.min(0.01, distance / 1000));
    controls.maxDistance = Math.max(extent * 15, distance * 2);
    camera.far = Math.max(100, extent * 50, distance * 4);
    camera.updateProjectionMatrix();
    controls.update();
    render();
  };
  const update = (next) => {
    const reframe = options.reference !== next.reference;
    options = next;
    if (options.animation) start_animation();
    else stop_animation();
    const angle = THREE.MathUtils.degToRad(options.lighting);
    light.position.set(Math.cos(angle) * 4, 3, Math.sin(angle) * 4);
    light.intensity = options.strength;
    reference.visible = options.reference;
    ruler.visible = options.reference;
    effects?.set_cardinality(
      options.flame_cardinality === "saved" ? null : options.flame_cardinality,
    );
    if (model) {
      if (density) {
        const result = density.set(options.density);
        if (density_count !== result.count && model_info) {
          density_count = result.count;
          on_info?.({
            ...model_info,
            triangles: Math.round(model_info.triangles + result.triangle_delta),
            grass_clumps: result.count,
          });
        }
      }
      model.scale.setScalar(options.scale);
      model.traverse((node) => {
        if (!node.isMesh || node.userData.inventory_effect) return;
        for (const material of [node.material].flat()) {
          const maps = material.userData.inventory_maps;
          material.map = options.wireframe ? null : maps.base;
          material.alphaMap = options.wireframe ? null : maps.alpha_map;
          material.alphaTest = options.wireframe ? 0 : maps.alpha;
          material.color.copy(
            options.wireframe ? new THREE.Color(0x24513b) : maps.color,
          );
          material.normalMap = options.normal ? maps.normal : null;
          material.roughnessMap = options.roughness ? maps.roughness : null;
          material.wireframe = options.wireframe;
          material.needsUpdate = true;
        }
      });
    }
    if (reframe) reset_camera();
    else render();
  };
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const context_lost = (event) => {
    event.preventDefault();
    context_failed = true;
    stop_animation();
    on_status("error");
  };
  canvas.addEventListener("webglcontextlost", context_lost);
  reset_camera();
  resize();
  update(options);
  load_inventory_model(asset, () => {
    if (disposed) return;
    if (model && model_info) {
      const repairs = repair_fbx_cutouts(model, asset.format);
      if (repairs) {
        model_info = {
          ...model_info,
          material_repairs: model_info.material_repairs + repairs,
        };
        on_info?.(model_info);
        update(options);
        return;
      }
    }
    render();
  })
    .then((loaded) => {
      if (disposed) {
        dispose_tree(loaded);
        return;
      }
      animation = create_inventory_animation(loaded);
      const bounds = new THREE.Box3().setFromObject(loaded, true),
        size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      model = new THREE.Group();
      const centered = new THREE.Group();
      centered.add(loaded);
      centered.position.set(-center.x, -bounds.min.y, -center.z);
      model.add(centered);
      extent = Math.max(1, size.x, size.y, size.z);
      model_height = size.y;
      model_size = size.clone();
      camera.far = Math.max(100, extent * 50);
      camera.updateProjectionMatrix();
      controls.maxDistance = extent * 15;
      ground.scale.setScalar(Math.max(1, extent));
      const material_repairs = repair_fbx_cutouts(model, asset.format);
      let triangles = 0,
        materials = new Set(),
        textures = new Set();
      model.traverse((node) => {
        if (!node.isMesh) return;
        triangles +=
          (node.geometry.index?.count ||
            node.geometry.attributes.position.count) / 3;
        for (const material of [node.material].flat()) {
          materials.add(material);
          Object.values(material)
            .filter((value) => value?.isTexture)
            .forEach((value) => textures.add(value));
          material.userData.inventory_maps = {
            base: material.map,
            normal: material.normalMap,
            roughness: material.roughnessMap,
            alpha: material.alphaTest,
            alpha_map: material.alphaMap,
            color: material.color.clone(),
          };
        }
      });
      model_info = {
        material_repairs,
        animations: animation.count,
        height: size.y,
        triangles: Math.round(triangles),
        materials: materials.size,
        textures: textures.size,
      };
      if (asset.id === "grasses-2") density = create_grass_density(model);
      // Effects sit in the model's source units, after bounds and counts.
      effects = create_material_effects(asset.effects);
      if (effects.count) {
        centered.add(effects.object);
        model_info = { ...model_info, effects: effects.count };
      }
      scene.add(model);
      if (!density) on_info?.(model_info);
      update(options);
      reset_camera();
      on_status("ready");
    })
    .catch(() => {
      if (!disposed) on_status("model_error");
    });
  return {
    update,
    reset_camera,
    dispose() {
      disposed = true;
      stop_animation();
      animation?.dispose();
      effects?.dispose();
      document.removeEventListener("visibilitychange", visibility_changed);
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", context_lost);
      controls.dispose();
      dispose_tree(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
