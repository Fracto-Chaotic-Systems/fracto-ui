import {
  zipSync,
  unzipSync,
  strToU8,
} from "three/addons/libs/fflate.module.js";
import {
  ASSET_FILE_LIMIT,
  asset_format,
  asset_model_paths,
  MODEL_FORMATS,
  expand_asset_files,
} from "@fracto/sdk/FractoAssetArchive.js";

export function inventory_import_upload(files, manifest) {
  return zipSync(
    {
      ...Object.fromEntries(
        files.map((file) => [`files/${file.path}`, file.data]),
      ),
      "manifest.json": strToU8(JSON.stringify(manifest)),
    },
    { level: 0 },
  );
}

// ZIP discovery stays local. RAR codecs and archive inspection belong to assets.
export async function prepare_inventory_import(files, inspect) {
  const expanded = expand_asset_files(files, unzipSync, {
    allow_no_model: true,
  });
  let models = expanded.models;
  if (expanded.entries.some((file) => asset_format(file.path) === "rar")) {
    const result = await inspect(files);
    if (
      !Array.isArray(result.models) ||
      result.models.length > ASSET_FILE_LIMIT ||
      result.models.some(
        (file) =>
          typeof file !== "string" ||
          !MODEL_FORMATS.includes(asset_format(file)) ||
          !/^source\/(files|extracted)\//.test(file),
      ) ||
      new Set(result.models).size !== result.models.length
    )
      throw Error("invalid_import");
    models = asset_model_paths(result.models.map((path) => ({ path })));
  }
  if (!models.length) throw Error("no_model");
  return { files, models };
}
