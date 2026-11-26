import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID, createHash } from "node:crypto";
import { create_component_document } from "@fracto/sdk/FractoComponentDocument.js";
import { empty_material_construction } from "@fracto/sdk/FractoMaterialMetadata.js";
import { component_runtime_json } from "@fracto/sdk/FractoComponentRuntime.js";
import {
  component_runtime_manifest_url,
  load_component_runtime,
} from "../src/utils/render/ComponentRuntimePackage.js";
import {
  inventory_file_url,
  inventory_resource_aliases,
} from "../src/pages/games/InventoryModelLoader.js";

function fixture() {
  const component = create_component_document(randomUUID(), "Published grass"),
    asset = { id: "tree", revision: "a".repeat(64) };
  component.objects = [
    {
      id: randomUUID(),
      asset,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      group_id: null,
    },
  ];
  const construction = {
    ...empty_material_construction(),
    kind: "model",
    placement: "ground",
    meters_per_unit: 1,
    dimensions_m: [1, 2, 1],
    up_axis: "y",
    forward_axis: "z",
    ground_anchor_m: [0, 0, 0],
    footprint_m: [1, 1],
  };
  const value = {
    schema_version: 1,
    source_revision: 17,
    source_document_sha256: "b".repeat(64),
    component,
    materials: [
      {
        material: { ...asset, construction },
        runtime: {
          id: "tree",
          model: "model.glb",
          format: "glb",
          resources: ["model.glb"],
        },
        file_paths: { "model.glb": "files/" + "d".repeat(64) + ".glb" },
      },
    ],
    files: [
      { path: "NOTICE.txt", sha256: "c".repeat(64), bytes: 1 },
      {
        path: "files/" + "d".repeat(64) + ".glb",
        sha256: "d".repeat(64),
        bytes: 10,
      },
    ],
  };
  const release = createHash("sha256")
    .update(component_runtime_json(value))
    .digest("hex");
  return {
    value,
    asset,
    url: `http://runtime.invalid/component-runtime/grass-strip/${release}/manifest.json`,
  };
}
test("published loader resolves every material and resource locally without any authoring API calls", async () => {
  const { value, asset, url } = fixture();
  let calls = 0;
  const loaded = await load_component_runtime(
    url,
    undefined,
    async (request, options) => {
      assert.equal(request, url);
      assert.equal(options.cache, "force-cache");
      calls++;
      return Response.json(value);
    },
  );
  value.component.name = "Rapid authoring change";
  const descriptors = await loaded.resolve_materials([asset, asset]);
  const descriptor = Object.values(descriptors)[0];
  assert.equal(loaded.document.name, "Published grass");
  assert.equal(loaded.source_revision, 17);
  assert.match(
    descriptor.runtime.file_urls["model.glb"],
    /\/files\/[a-f0-9]{64}\.glb$/,
  );
  assert.equal(calls, 1);
  assert.equal(
    inventory_file_url(descriptor.runtime, "model.glb"),
    descriptor.runtime.file_urls["model.glb"],
  );
  assert.throws(
    () => inventory_file_url(descriptor.runtime, "not-packaged.glb"),
    /runtime_file_not_declared/,
  );
  await assert.rejects(
    loaded.resolve_materials([{ ...asset, revision: "f".repeat(64) }]),
    /runtime_material_missing/,
  );
  assert.equal(calls, 1);
});
test("release identity is verified and a missing/corrupt package never falls back to authoring", async () => {
  const { value, url } = fixture();
  await assert.rejects(
    load_component_runtime(
      url,
      undefined,
      async () => new Response("missing", { status: 404 }),
    ),
    /runtime_release_unavailable/,
  );
  value.component.name = "Tampered";
  await assert.rejects(
    load_component_runtime(url, undefined, async () => Response.json(value)),
    /hash_mismatch/,
  );
});

test("flattened resources preserve relative texture references with duplicate filenames", () => {
  const runtime = {
    model: "source/scene.gltf",
    resources: ["source/scene.gltf", "source/a/leaf.png", "source/b/leaf.png"],
    file_urls: {
      "source/scene.gltf": "http://runtime.invalid/release/files/model.gltf",
      "source/a/leaf.png": "http://runtime.invalid/release/files/image-a.png",
      "source/b/leaf.png": "http://runtime.invalid/release/files/image-b.png",
    },
  };
  const aliases = inventory_resource_aliases(runtime);
  assert.equal(
    aliases.get("http://runtime.invalid/release/files/a/leaf.png"),
    "source/a/leaf.png",
  );
  assert.equal(
    aliases.get("http://runtime.invalid/release/files/b/leaf.png"),
    "source/b/leaf.png",
  );
});
test("lab and production use the existing canonical asset route; direct UI uses its thin proxy", () => {
  const key = "grass-strip",
    release = "a".repeat(64);
  assert.equal(
    component_runtime_manifest_url(
      key,
      release,
      { origin: "http://lab.invalid:3000", port: "3000" },
      "/",
    ),
    `http://lab.invalid:3000/api/asset/component-runtime/${key}/${release}/manifest.json`,
  );
  assert.equal(
    component_runtime_manifest_url(
      key,
      release,
      { origin: "http://localhost:3106", port: "3106" },
      "/",
    ),
    `http://localhost:3106/api/component-runtime/${key}/${release}/manifest.json`,
  );
});
