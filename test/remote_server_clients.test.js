import assert from "node:assert/strict";
import { test } from "node:test";
import { create_remote_clients_reader } from "../src/backend/RemoteServerClients.js";

test("remote client discovery is always credential-free and remembers the nginx endpoint", async () => {
  const calls = [];
  const read = create_remote_clients_reader(async (url, options) => {
    calls.push(url);
    assert.equal(options.credentials, "omit");
    return url.includes("/api/main/")
      ? { contract_version: 1, clients: [] }
      : {};
  });
  assert.deepEqual(await read("http://remote/"), {
    contract_version: 1,
    clients: [],
  });
  await read("http://remote/");
  assert.deepEqual(calls, [
    "http://remote/clients",
    "http://remote/api/main/clients",
    "http://remote/api/main/clients",
  ]);
});
test("authorization failures never trigger credential forwarding", async () => {
  const read = create_remote_clients_reader(async (_url, options) => {
    assert.equal(options.credentials, "omit");
    throw Error("HTTP 403");
  });
  await assert.rejects(read("http://remote/"), /HTTP 403/);
});
