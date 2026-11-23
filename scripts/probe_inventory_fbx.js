import fs from "node:fs";
import process from "node:process";
import { Buffer } from "node:buffer";
import vm from "node:vm";
import { createRequire } from "node:module";
import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { transformSync } from "esbuild";
import { validate_model_category } from "@fracto/sdk/FractoEnvironmentCatalog.js";
const [id, origin = "http://127.0.0.1:3006", category = "material"] =
  process.argv.slice(2);
if (!id || !/^[a-z][a-z0-9-]{0,63}$/.test(id))
  throw Error("Usage: inventory:probe-fbx <asset-id> [UI origin] [category]");
validate_model_category(category);
const address = new URL(origin);
if (!["http:", "https:"].includes(address.protocol))
  throw Error("Invalid UI origin");
const hold = setInterval(() => {}, 1000);
const original_load = THREE.TextureLoader.prototype.load;
const original_progress = globalThis.ProgressEvent;
const resources = [];
try {
  const response = await fetch(
    `${address.origin}/api/environment-catalog?category=${category}`,
    { signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok) throw Error("Catalog request failed");
  const asset = (await response.json()).assets.find((asset) => asset.id === id);
  if (!asset) throw Error("Asset is missing");
  globalThis.ProgressEvent = class extends Event {
    constructor(type, properties) {
      super(type);
      Object.assign(this, properties);
    }
  };
  THREE.TextureLoader.prototype.load = function (url, on_load) {
    const resolved = this.manager.resolveURL(url);
    resources.push(resolved);
    const texture = new THREE.Texture();
    if (on_load) queueMicrotask(() => on_load(texture));
    return texture;
  };
  if (asset.format !== "fbx") throw Error("This probe checks FBX imports");
  const source = fs
    .readFileSync(
      new URL("../src/pages/games/InventoryModelLoader.js", import.meta.url),
      "utf8",
    )
    .replace(/^import[^;]+;\r?\n/gm, "");
  const code = transformSync(source, {
    format: "cjs",
    loader: "js",
    define: { "import.meta.env.BASE_URL": '"/"' },
  }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: createRequire(import.meta.url),
    THREE,
    FBXLoader,
    URL,
    window: { location: { origin: address.origin } },
  });
  const model = await module.exports.load_inventory_model(asset);
  let triangles = 0,
    meshes = 0;
  model.traverse((node) => {
    if (node.isMesh) {
      meshes++;
      triangles +=
        (node.geometry.index?.count ||
          node.geometry.attributes.position.count) / 3;
    }
  });
  const size = new THREE.Box3()
    .setFromObject(model)
    .getSize(new THREE.Vector3());
  if (!meshes || !Number.isFinite(size.y) || !triangles)
    throw Error("Model geometry is empty");
  for (const url of [...new Set(resources)]) {
    const file = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!file.ok) throw Error("Texture unavailable");
    const bytes = Buffer.from(await file.arrayBuffer());
    if (
      !bytes.length ||
      (/\.png$/i.test(new URL(url).pathname) &&
        bytes.subarray(1, 4).toString() !== "PNG")
    )
      throw Error("Invalid texture response");
  }
  console.log(
    JSON.stringify({
      id: asset.id,
      format: asset.format,
      meshes,
      triangles,
      textures_loaded: new Set(resources).size,
      registered_pngs: asset.resources.filter((path) => /\.png$/i.test(path))
        .length,
      finite_bounds: true,
    }),
  );
} finally {
  THREE.TextureLoader.prototype.load = original_load;
  if (original_progress === undefined) delete globalThis.ProgressEvent;
  else globalThis.ProgressEvent = original_progress;
  clearInterval(hold);
}
