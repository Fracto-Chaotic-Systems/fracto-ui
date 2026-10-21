import assert from "node:assert/strict";
import { test } from "node:test";
import { create_remote_health_reader } from "../src/backend/RemoteServerHealth.js";
const health = { contract_version: 1, services: { main: "healthy" } };

test("direct main-server health retains credential-free requests", async () => {
  const calls = [];
  const read = create_remote_health_reader(async (url, options) => {
    calls.push(url);
    assert.equal(options.credentials, "omit");
    assert.ok(options.signal instanceof AbortSignal);
    return health;
  });
  assert.equal(await read("http://10.0.0.182:3001/"), health);
  assert.deepEqual(calls, ["http://10.0.0.182:3001/healthz"]);
});

for (const first of ["cors", "html"]) {
  test(`nginx discovery falls back after ${first} and remembers the working route`, async () => {
    const calls = [];
    const read = create_remote_health_reader(async (url) => {
      calls.push(url);
      if (url.endsWith("/api/main/healthz")) return health;
      if (first === "cors") throw new TypeError("Failed to fetch");
      return {};
    });
    assert.equal(await read("http://10.0.0.182:3000/"), health);
    assert.equal(await read("http://10.0.0.182:3000/"), health);
    assert.deepEqual(calls, [
      "http://10.0.0.182:3000/healthz",
      "http://10.0.0.182:3000/api/main/healthz",
      "http://10.0.0.182:3000/api/main/healthz",
    ]);
  });
}

test("a changed deployment is rediscovered and health contracts remain validated", async () => {
  let proxied = true;
  const read = create_remote_health_reader(async (url) => {
    if (url.includes("/api/main/") === proxied) return health;
    throw new Error("not found");
  });
  assert.equal(await read("http://server"), health);
  proxied = false;
  assert.equal(await read("http://server"), health);
  const invalid = create_remote_health_reader(async () => ({
    contract_version: 2,
    services: {},
  }));
  await assert.rejects(
    invalid("http://server"),
    /Unsupported server health contract/,
  );
});
