import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";
import { loadConfigFromFile } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));

for (const entry of ["flight_controls_smoke.html", "flight_validation.html"]) {
  test(`${entry} bundles against current application exports`, async () => {
    const html = readFileSync(path.join(root, "scripts", entry), "utf8");
    const script = html.match(
      /<script\s+type="module">([\s\S]*?)<\/script>/,
    )?.[1];
    assert.ok(script, "The preview must have its module entry");
    const result = await build({
      stdin: {
        contents: script,
        resolveDir: path.join(root, "scripts"),
        sourcefile: entry,
      },
      bundle: true,
      write: false,
      outdir: path.join(root, ".flight-preview-check"),
      platform: "browser",
      format: "esm",
      packages: "external",
      logLevel: "silent",
    });
    assert.ok(result.outputFiles[0].text.length > 0);
  });
}

test("Vite scans the application entry instead of preview and generated report HTML", async () => {
  const result = await loadConfigFromFile(
    { command: "serve", mode: "development" },
    path.join(root, "vite.config.js"),
    root,
    "silent",
  );
  assert.deepEqual(result.config.optimizeDeps.entries, ["index.html"]);
  assert.ok(
    readFileSync(path.join(root, "index.html"), "utf8").includes(
      'type="module"',
    ),
  );
});
