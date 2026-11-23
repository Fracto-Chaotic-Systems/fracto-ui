import { load_inventory_model } from "../src/pages/games/InventoryModelLoader.js";
import { create_inventory_animation } from "../src/pages/games/InventoryAnimation.js";
import {
  create_inventory_scene,
  DEFAULT_INVENTORY_PREVIEW,
} from "../src/pages/games/InventoryScene.js";

// Development-only, read-only probe through the same catalog and scene as Games.
const result = document.getElementById("result");
const errors = [];
const original_error = console.error;
console.error = (...args) => {
  errors.push(String(args[0]));
  original_error(...args);
};
let scene;
try {
  const query = new URLSearchParams(location.search),
    id = query.get("id");
  if (!id) throw Error("Specify an asset id");
  const response = await fetch(
    `/api/environment-catalog?category=${encodeURIComponent(query.get("category") || "material")}`,
  );
  if (!response.ok) throw Error("Catalog unavailable");
  const asset = (await response.json()).assets.find((asset) => asset.id === id);
  if (!asset) throw Error("Asset unavailable");
  const root = await load_inventory_model(asset);
  const materials = new Set(),
    morphs = [];
  root.traverse((node) => {
    if (node.isMesh)
      [node.material].flat().forEach((material) => materials.add(material));
    if (node.morphTargetInfluences) morphs.push(node);
  });
  const playback = create_inventory_animation(root);
  const initial = morphs.map((node) => [...node.morphTargetInfluences]);
  playback.update(0.5);
  const morph_changed = initial.some((values, i) =>
    values.some(
      (v, k) => Math.abs(v - morphs[i].morphTargetInfluences[k]) > 1e-6,
    ),
  );
  playback.dispose();
  root.traverse((node) => {
    node.geometry?.dispose();
  });
  materials.forEach((material) => {
    Object.values(material)
      .filter((v) => v?.isTexture)
      .forEach((texture) => {
        texture.source?.data?.close?.();
        texture.dispose();
      });
    material.dispose();
  });
  let stats;
  await new Promise((resolve, reject) => {
    scene = create_inventory_scene(document.getElementById("preview"), {
      label: "Preview validation",
      asset,
      on_info: (info) => {
        stats = info;
      },
      on_status: (status) => {
        if (status === "ready") resolve();
        else if (status.includes("error")) reject(Error(status));
      },
    });
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  scene.update({ ...DEFAULT_INVENTORY_PREVIEW, roughness: false });
  scene.update({ ...DEFAULT_INVENTORY_PREVIEW, animation: false });
  result.textContent = JSON.stringify({
    status: errors.length ? "error" : "passed",
    animations: playback.count,
    morph_changed,
    ...stats,
    shader_errors: errors.length,
  });
} catch (error) {
  result.textContent = JSON.stringify({
    status: "failed",
    error: error.message,
  });
}
window.addEventListener("pagehide", () => scene?.dispose(), { once: true });
