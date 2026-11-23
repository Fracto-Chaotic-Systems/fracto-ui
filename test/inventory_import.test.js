import assert from "node:assert/strict";
import test from "node:test";
import { unzipSync } from "three/addons/libs/fflate.module.js";
import {
  prepare_inventory_import,
  inventory_import_upload,
} from "../src/pages/games/InventoryImportData.js";

const file = (path) => ({ path, data: new Uint8Array([1, 2, 3]) });
test("RAR-only folders use server inspection and offer extracted FBX/OBJ choices", async () => {
  const files = [file("bush.rar")];
  let requests = 0;
  const prepared = await prepare_inventory_import(files, async (received) => {
    requests++;
    assert.equal(received, files);
    return {
      models: [
        "source/extracted/bush/model.obj",
        "source/extracted/bush/model.fbx",
      ],
    };
  });
  assert.equal(requests, 1);
  assert.equal(prepared.files, files);
  assert.deepEqual(prepared.models, [
    "source/extracted/bush/model.fbx",
    "source/extracted/bush/model.obj",
  ]);
  const upload = unzipSync(
    inventory_import_upload(files, { model_category: "material" }),
  );
  assert.deepEqual(upload["files/bush.rar"], files[0].data);
  assert.deepEqual(
    JSON.parse(new TextDecoder().decode(upload["manifest.json"])),
    { model_category: "material" },
  );
});
test("direct models keep local discovery and do not call the inspection service", async () => {
  const result = await prepare_inventory_import([file("bush.obj")], () => {
    throw Error("Unexpected request");
  });
  assert.deepEqual(result.models, ["source/files/bush.obj"]);
  await assert.rejects(
    prepare_inventory_import([file("readme.txt")], () => {}),
    /no_model/,
  );
});
test("inspection failures and malformed model paths never become selectable imports", async () => {
  await assert.rejects(
    prepare_inventory_import([file("bush.rar")], async () => {
      throw Error("invalid_archive");
    }),
    /invalid_archive/,
  );
  for (const models of [
    null,
    ["https://outside/model.obj"],
    ["source/extracted/../bad.obj"],
    ["source/extracted/a.exe"],
    ["source/extracted/a.obj", "source/extracted/a.obj"],
  ])
    await assert.rejects(
      prepare_inventory_import([file("bush.rar")], async () => ({ models })),
    );
});
