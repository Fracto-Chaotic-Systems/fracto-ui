import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import {
  component_reference_key,
  COMPONENT_MATERIAL_LIMIT,
} from "@fracto/sdk/FractoComponentTools.js";
test("material resolution accepts the unique rock set, deduplicates pins, bounds concurrency and rejects overflow before requests", async () => {
  const source = readFileSync(
    new URL("../src/pages/games/ComponentMaterialApi.js", import.meta.url),
    "utf8",
  ).replace(/^import[^;]+;\r?\n/gm, "");
  const module = { exports: {} };
  let calls = 0,
    active = 0,
    peak = 0;
  runInNewContext(
    transformSync(source, {
      loader: "js",
      format: "cjs",
      define: { "import.meta.env.BASE_URL": '"/"' },
    }).code,
    {
      module,
      exports: module.exports,
      component_reference_key,
      COMPONENT_MATERIAL_LIMIT,
      AbortSignal,
      fetch: async (url) => {
        calls++;
        active++;
        peak = Math.max(peak, active);
        await Promise.resolve();
        const id = decodeURIComponent(
          url.split("/environment-catalog/")[1].split("/")[0],
        );
        active--;
        return {
          ok: true,
          json: async () => ({
            material: { id, revision: "a".repeat(64) },
            runtime: { id, resources: [] },
          }),
        };
      },
    },
  );
  const refs = Array.from({ length: 88 }, (_, i) => ({
    id: "rock-" + i,
    revision: "a".repeat(64),
  }));
  const result = await module.exports.resolve_component_references([
    ...refs,
    ...refs,
  ]);
  assert.equal(Object.keys(result).length, 88);
  assert.equal(calls, 88);
  assert.ok(peak <= 4);
  await assert.rejects(
    module.exports.resolve_component_references(
      Array.from({ length: 129 }, (_, i) => ({
        id: "rock-" + i,
        revision: "a".repeat(64),
      })),
    ),
    /construction_limit/,
  );
  assert.equal(calls, 88);
});
