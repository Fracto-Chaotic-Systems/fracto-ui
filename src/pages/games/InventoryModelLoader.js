import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { TDSLoader } from "three/addons/loaders/TDSLoader.js";

export const inventory_file_url = (asset, file) =>
  new URL(
    `${import.meta.env.BASE_URL}api/environment-catalog/${encodeURIComponent(asset.id)}/files/${file.split("/").map(encodeURIComponent).join("/")}`,
    window.location.origin,
  ).href;

export async function load_inventory_model(asset, on_resources) {
  const files = [...new Set([asset.model, ...asset.resources].filter(Boolean))];
  const urls = new Map(
    files.map((file) => [inventory_file_url(asset, file), file]),
  );
  const url = inventory_file_url(asset, asset.model),
    manager = new THREE.LoadingManager();
  manager.onLoad = () => on_resources?.();
  manager.setURLModifier((requested) => {
    if (/^(?:data:|blob:)/.test(requested)) return requested;
    const resolved = new URL(requested, url).href;
    if (urls.has(resolved)) return resolved;
    // Some FBX exports retain absolute author-machine texture paths.
    const name = decodeURIComponent(
      requested.replaceAll("\\", "/").split("/").at(-1),
    );
    const model_parts = asset.model.split("/").slice(0, -1);
    const score = (file) => {
      const parts = file.split("/");
      let count = 0;
      while (
        count < model_parts.length &&
        parts[count]?.toLowerCase() === model_parts[count].toLowerCase()
      )
        count++;
      return count;
    };
    const matches = files
      .filter(
        (file) => file.split("/").at(-1).toLowerCase() === name.toLowerCase(),
      )
      .sort((a, b) => score(b) - score(a));
    if (
      matches.length === 1 ||
      (matches.length > 1 && score(matches[0]) > score(matches[1]))
    )
      return inventory_file_url(asset, matches[0]);
    throw new Error("unresolved_asset_resource");
  });
  if (["glb", "gltf"].includes(asset.format))
    return (await new GLTFLoader(manager).loadAsync(url)).scene;
  if (asset.format === "fbx") return new FBXLoader(manager).loadAsync(url);
  if (asset.format === "3ds") return new TDSLoader(manager).loadAsync(url);
  if (asset.format === "obj") {
    const loader = new OBJLoader(manager);
    const same_name = asset.model.replace(/\.obj$/i, ".mtl");
    const materials = files.includes(same_name)
      ? same_name
      : files.filter((file) => /\.mtl$/i.test(file)).length === 1
        ? files.find((file) => /\.mtl$/i.test(file))
        : null;
    if (materials) {
      const library = await new MTLLoader(manager).loadAsync(
        inventory_file_url(asset, materials),
      );
      library.preload();
      loader.setMaterials(library);
    }
    return loader.loadAsync(url);
  }
  throw new Error("unsupported_model");
}
