import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import {
  FIRE_CARDINALITIES,
  FIRE_PALETTES,
} from "@fracto/sdk/FractoMaterialEffects.js";

const require = createRequire(import.meta.url);
/** Loads the shared right-panel preview controls with stub text for tests. */
export function load_preview_controls() {
  const source = readFileSync(
    new URL("../src/pages/games/InventoryPreviewControls.jsx", import.meta.url),
    "utf8",
  ).replace(/^import[^;]+;\r?\n/gm, "");
  const module = { exports: {} };
  runInNewContext(
    transformSync(source, { loader: "jsx", format: "cjs", jsx: "automatic" })
      .code,
    {
      module,
      exports: module.exports,
      require,
      AppText: { get: (key) => key },
      INVENTORY_TEXT: new Proxy({}, { get: (_, key) => key }),
      FIRE_CARDINALITIES,
      FIRE_PALETTES,
    },
  );
  return module.exports;
}
