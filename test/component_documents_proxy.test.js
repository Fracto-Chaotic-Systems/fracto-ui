import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import express from "express";
import { create_component_documents_proxy } from "../scripts/component_documents_proxy.js";

test("component proxy relays saves and conflicts without forwarding browser service tokens", async (t) => {
  const previous = process.env.FRACTO_DATA_PORT;
  t.after(() => {
    if (previous === undefined) delete process.env.FRACTO_DATA_PORT;
    else process.env.FRACTO_DATA_PORT = previous;
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
  const body = JSON.stringify({
    document: { name: "Path" },
    expected_revision: 2,
  });
  const data = http.createServer(async (req, res) => {
    let received = "";
    for await (const chunk of req) received += chunk;
    assert.equal(req.url, "/component-documents/test");
    assert.equal(req.method, "PUT");
    assert.equal(req.headers.origin, "http://ui.test");
    assert.equal(req.headers.cookie, "session=test");
    assert.equal(req.headers["x-fracto-service-token"], undefined);
    assert.equal(received, body);
    res.writeHead(409, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify({ error: "component_conflict" }));
  });
  process.env.FRACTO_DATA_PORT = String(await start(data));
  const app = express();
  app.use("/api/component-documents", create_component_documents_proxy());
  const port = await start(http.createServer(app));
  const response = await fetch(
    `http://127.0.0.1:${port}/api/component-documents/test`,
    {
      method: "PUT",
      headers: {
        Origin: "http://ui.test",
        Cookie: "session=test",
        "Content-Type": "application/json",
        "X-Fracto-Service-Token": "do-not-forward",
      },
      body,
    },
  );
  assert.equal(response.status, 409);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { error: "component_conflict" });
});
