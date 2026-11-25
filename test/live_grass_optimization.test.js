import assert from "node:assert/strict";
import test from "node:test";
import process from "node:process";
import { Buffer } from "node:buffer";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const base = process.env.FRACTO_TEST_RUNTIME_BASE;
const original_release =
  "d8e227c70918a9be7a1db2ba1f7f759de1ae7d8a9e9cd0d9c79bbf7df326716c";
const optimized_release =
  "bd9af53adc6de4a1be2b1bf8a789ef99fa5bd6399dcedf35b0db1d5a655caf69";
const read = async (url) => {
  const response = await fetch(url);
  assert.equal(response.status, 200, url);
  return Buffer.from(await response.arrayBuffer());
};
const glb = (b) => {
  const end = 20 + b.readUInt32LE(12);
  return { json: JSON.parse(b.subarray(20, end)), binary: b.subarray(end + 8) };
};
test(
  "published grass buffers decode exactly with the viewer's bundled decoder, including every morph frame and texture",
  { skip: !base },
  async () => {
    const original_url = `${base}/grass-strip/${original_release}/`,
      optimized_url = `${base}/grass-strip/${optimized_release}/`;
    const original = JSON.parse(await read(original_url + "manifest.json")),
      optimized = JSON.parse(await read(optimized_url + "manifest.json"));
    assert.deepEqual(optimized.component, original.component);
    await MeshoptDecoder.ready;
    for (const id of ["animated-grass", "yard-grass"]) {
      const before = original.materials.find((d) => d.material.id === id),
        after = optimized.materials.find((d) => d.material.id === id);
      assert.deepEqual(after.material, before.material);
      const a = glb(
          await read(original_url + before.file_paths[before.runtime.model]),
        ),
        b = glb(
          await read(optimized_url + after.file_paths[after.runtime.model]),
        );
      for (const key of [
        "accessors",
        "meshes",
        "nodes",
        "skins",
        "animations",
        "materials",
        "images",
        "textures",
        "samplers",
        "scenes",
        "scene",
      ])
        assert.deepEqual(b.json[key], a.json[key], `${id} ${key}`);
      assert.equal(b.json.bufferViews.length, a.json.bufferViews.length);
      for (const [index, view] of b.json.bufferViews.entries()) {
        const source = a.json.bufferViews[index],
          ext = view.extensions?.EXT_meshopt_compression;
        const raw = a.binary.subarray(
          source.byteOffset || 0,
          (source.byteOffset || 0) + source.byteLength,
        );
        const decoded = ext
          ? Buffer.from(
              await MeshoptDecoder.decodeGltfBufferAsync(
                ext.count,
                ext.byteStride,
                b.binary.subarray(
                  ext.byteOffset,
                  ext.byteOffset + ext.byteLength,
                ),
                ext.mode,
                ext.filter,
              ),
            )
          : b.binary.subarray(
              view.byteOffset || 0,
              (view.byteOffset || 0) + view.byteLength,
            );
        assert.deepEqual(decoded, raw, `${id} bufferView ${index}`);
      }
    }
  },
);
