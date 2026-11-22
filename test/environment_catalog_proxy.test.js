import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import { create_environment_catalog_proxy } from "../scripts/environment_catalog_proxy.js";

test("catalog proxy relays the HTTP contract without forwarding browser service tokens", async (t) => {
  const previous = process.env.FRACTO_ASSET_PORT;
  t.after(() => {
    if (previous === undefined) delete process.env.FRACTO_ASSET_PORT;
    else process.env.FRACTO_ASSET_PORT = previous;
  });
  const start = async (server) => {
    server.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    t.after(
      () =>
        new Promise((resolve) => {
          server.closeAllConnections();
          server.close(resolve);
        }),
    );
    return server.address().port;
  };
  const asset = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    assert.equal(req.url, "/environment-catalog/import");
    assert.equal(req.method, "POST");
    assert.equal(req.headers.origin, "http://example.test");
    assert.equal(req.headers.cookie, "session=test");
    assert.equal(req.headers["x-fracto-service-token"], undefined);
    assert.deepEqual(Buffer.concat(chunks), Buffer.from([0, 255, 1, 2]));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ id: "grass", duplicate: false }));
  });
  process.env.FRACTO_ASSET_PORT = String(await start(asset));
  const app = express();
  app.use("/api/environment-catalog", create_environment_catalog_proxy());
  const port = await start(http.createServer(app));
  const response = await fetch(
    `http://127.0.0.1:${port}/api/environment-catalog/import`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/zip",
        Origin: "http://example.test",
        Cookie: "session=test",
        "X-Fracto-Service-Token": "must-not-forward",
      },
      body: Buffer.from([0, 255, 1, 2]),
    },
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: "grass", duplicate: false });
});
