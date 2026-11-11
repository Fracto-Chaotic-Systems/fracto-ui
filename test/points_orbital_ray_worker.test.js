import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

test("selected-ray worker streams each complete family once and avoids duplicating final geometry", async () => {
  const first = {
    angle: { key: "0/1" },
    points: [
      { x: 8, y: 0 },
      { x: 1, y: 0 },
    ],
  };
  const next = [{ angle: { key: "1/3" } }, { angle: { key: "2/3" } }];
  const messages = [],
    scope = { postMessage: (message) => messages.push(message) };
  const source = readFileSync(
    new URL(
      "../src/pages/study/points/PointsOrbitalRays.worker.js",
      import.meta.url,
    ),
    "utf8",
  ).replace(/^import[^;]+;\r?\n/, "");
  runInNewContext(source, {
    self: scope,
    Set,
    trace_known_dynamic_rays: async (request, { on_progress }) => {
      assert.equal(request.orbital_id, "42");
      on_progress({ processed: 0, total: 3, rays: [] });
      on_progress({ processed: 1, total: 3, rays: [first] });
      on_progress({ processed: 2, total: 3, rays: [] });
      on_progress({ processed: 3, total: 3, rays: [first, ...next] });
      return {
        status: "rays_found",
        rays: [first, ...next],
        processed: 3,
        total: 3,
      };
    },
  });
  await scope.onmessage({ data: { id: 17, request: { orbital_id: "42" } } });
  assert.deepEqual(
    messages.map(
      (message) => message.progress?.rays.length ?? message.result.rays.length,
    ),
    [0, 1, 0, 2, 0],
  );
  assert.equal(messages.at(-1).result.status, "rays_found");
  assert.ok(messages.every((message) => message.id === 17));
});
