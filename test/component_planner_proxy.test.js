import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import express from "express";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { create_component_planner_proxy } from "../scripts/component_planner_proxy.js";

test("stage transport forwards only to the browser capability and strips caller machine/service tokens", async (t) => {
  const previous = process.env.FRACTO_AI_PORT;
  t.after(() => {
    if (previous === undefined) delete process.env.FRACTO_AI_PORT;
    else process.env.FRACTO_AI_PORT = previous;
  });
  const listen = async (server) => {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    t.after(() => {
      server.closeAllConnections();
      return new Promise((resolve) => server.close(resolve));
    });
    return server.address().port;
  };
  const upstream = http.createServer(async (req, res) => {
    assert.equal(req.url, "/construction/plan");
    assert.equal(req.method, "POST");
    assert.equal(req.headers["x-fracto-ai-token"], undefined);
    assert.equal(req.headers["x-fracto-service-token"], undefined);
    assert.equal(req.headers.cookie, "session=test");
    assert.equal(req.headers.origin, "http://ui.test");
    let data = "";
    for await (const chunk of req) data += chunk;
    assert.deepEqual(JSON.parse(data), {
      contract_version: 1,
      brief: "Floor",
      document: {},
    });
    res.writeHead(504, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify({ error: "DEADLINE_EXCEEDED" }));
  });
  process.env.FRACTO_AI_PORT = String(await listen(upstream));
  const app = express();
  app.use("/api/component-construction", create_component_planner_proxy());
  const port = await listen(http.createServer(app));
  const response = await fetch(
    `http://127.0.0.1:${port}/api/component-construction/plan`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://ui.test",
        Cookie: "session=test",
        "X-Fracto-AI-Token": "private-machine",
        "X-Fracto-Service-Token": "private-service",
      },
      body: JSON.stringify({
        contract_version: 1,
        brief: "Floor",
        document: {},
      }),
    },
  );
  assert.equal(response.status, 504);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { error: "DEADLINE_EXCEEDED" });
});
test("development, production and nginx mount the dedicated stage planning transport", () => {
  for (const file of [
    "../scripts/environment_catalog_plugin.js",
    "../scripts/serve_ui.js",
  ]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(source, /api\/component-construction/);
    assert.match(source, /create_component_planner_proxy/);
  }
  for (const file of [
    "../../../deploy/nginx/fracto.conf.example",
    "../../../deploy/nginx/fracto-lab.conf.example",
  ]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(source, /location = \/api\/component-construction\/plan/);
    assert.match(
      source,
      /proxy_pass http:\/\/127\.0\.0\.1:3007\/construction\/plan;/,
    );
    assert.match(source, /inference\|peer/);
  }
});
