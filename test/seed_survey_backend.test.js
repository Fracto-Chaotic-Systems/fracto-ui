import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("browser client sends independent grid/canvas dimensions and explicit sampling/encoding", async () => {
  const source = readFileSync(
    new URL("../src/backend/DataBackend.jsx", import.meta.url),
    "utf8",
  );
  let requested;
  const DataBackend = vm.runInNewContext(
    source
      .replace(/^import[\s\S]*?;\r?\n/gm, "")
      .replace(/^export class /gm, "class ")
      .replace(/^export default .*;$/gm, "") + "\nDataBackend",
    {
      URLSearchParams,
      FETCH_JSON_HEADERS: {},
      service_origin: () => "http://data.test",
      fetch: async (url) => {
        requested = url;
        return { ok: true, json: async () => ({ result: { job_id: "job" } }) };
      },
    },
  );
  await new Promise((resolve) =>
    DataBackend.start_seed_survey(
      { x: 0.1, y: 0.2 },
      157,
      1.5,
      100000,
      resolve,
      { canvas_size: 350, sampling: "centers", encoding: "packed" },
    ),
  );
  const params = new URL(requested).searchParams;
  assert.equal(params.get("grid_size"), "157");
  assert.equal(params.get("canvas_size"), "350");
  assert.equal(params.get("sampling"), "centers");
  assert.equal(params.get("encoding"), "packed");
});
