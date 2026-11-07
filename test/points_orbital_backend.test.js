import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

test("stored orbital client preserves exact focal coordinates and uses only the narrow browser action", async () => {
  const calls = [];
  const source = readFileSync(
    new URL("../src/backend/DataBackend.jsx", import.meta.url),
    "utf8",
  )
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace("export class DataBackend", "class DataBackend")
    .replace(/^export default .*;$/gm, "");
  const Backend = runInNewContext(source + ";DataBackend", {
    service_origin: (service) => {
      assert.equal(service, "data");
      return "http://data.example";
    },
    request_json: async (url, options) => {
      calls.push({ url: new URL(url), options });
      return { result: [] };
    },
    URLSearchParams,
    FETCH_JSON_HEADERS: {},
  });
  const signal = new AbortController().signal;
  await Backend.stored_orbitals(
    { x: "0.12345678901234567890123456789", y: "-0.2" },
    signal,
    "100",
  );
  assert.equal(calls[0].url.pathname, "/orbital-data");
  assert.equal(calls[0].url.searchParams.get("view"), "survey");
  assert.equal(
    calls[0].url.searchParams.get("focal_re"),
    "0.12345678901234567890123456789",
  );
  assert.equal(calls[0].url.searchParams.get("after"), "100");
  assert.equal(calls[0].options.signal, signal);
  await Backend.stored_orbital("55", signal);
  assert.equal(calls[1].url.pathname, "/orbital-data/55");
  await Backend.calculate_bailiwick_orbitals("55", signal);
  assert.equal(
    calls[2].url.pathname,
    "/orbital-data/bailiwicks/55/discovery-jobs",
  );
  assert.equal(calls[2].options.method, "POST");
  assert.equal(calls[2].options.body, "{}");
  assert.equal(calls[2].options.signal, signal);
  assert.deepEqual(Object.keys(calls[2].options.headers), ["Content-Type"]);
  await Backend.orbital_discovery_job("job-55", signal);
  assert.equal(calls[3].url.pathname, "/orbital-data/discovery-jobs/job-55");
});
