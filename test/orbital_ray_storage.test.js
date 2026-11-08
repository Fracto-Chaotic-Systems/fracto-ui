import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import * as cache from "../../../sdk/orbitals/FractoOrbitalRayCache.js";
import { SEED_SURVEY_RAY_OPTIONS } from "../../../sdk/orbitals/FractoDynamicRays.js";
import { trace_known_dynamic_rays } from "../../../sdk/orbitals/FractoKnownDynamicRays.js";
import { build_orbital_trace_request } from "../src/pages/study/points/PointsOrbitalTraceRequest.js";

const request = build_orbital_trace_request(
  { x: "0", y: "0" },
  {
    orbital_id: "42",
    period: 1,
    points: [
      {
        point_index: 0,
        point: { re: "1", im: "0" },
        landing_ratios: [{ numerator: "0", denominator: "1" }],
      },
    ],
  },
);
const source = readFileSync(
  new URL("../src/pages/study/points/OrbitalRayStorage.js", import.meta.url),
  "utf8",
)
  .replace(/^import[\s\S]*?;\r?\n/gm, "")
  .replace("export default class", "class");
const load = (DataBackend) =>
  runInNewContext(source + ";OrbitalRayStorage", {
    ...cache,
    SEED_SURVEY_RAY_OPTIONS,
    DataBackend,
    AbortSignal,
  });

test("ray storage persists immutable requests and reloads after a fresh browser module", async () => {
  let durable = null,
    reads = 0;
  const writes = [];
  const backend = {
    async get_orbital_ray_paths() {
      reads++;
      return { result: durable };
    },
    async save_orbital_ray_paths(id, body) {
      writes.push({ id, body });
      durable = cache.merge_orbital_ray_cache(
        durable,
        body.request,
        body.rays,
        body.quality,
      );
      return { result: { saved: true } };
    },
  };
  const Storage = load(backend),
    original = structuredClone(request);
  const first = new Storage(original);
  assert.equal(await first.load(), null);
  original.focal_point.x = "2";
  const rays = (await trace_known_dynamic_rays(request)).rays;
  await first.save(rays);
  assert.equal(writes[0].body.request.focal_point.x, "0");
  assert.equal(writes[0].id, "42");
  assert.equal(
    cache.cached_orbital_rays(await new Storage(request).load(), request)
      .length,
    1,
  );
  assert.equal(reads, 1, "repeat selections use the bounded memory cache");
  const FreshStorage = load(backend);
  assert.equal(
    cache.cached_orbital_rays(await new FreshStorage(request).load(), request)
      .length,
    1,
  );
  assert.equal(reads, 2, "new module retrieves persisted geometry");
});

test("a failed save does not poison the next queued write", async () => {
  let attempts = 0;
  const Storage = load({
    async save_orbital_ray_paths() {
      if (++attempts === 1) throw Error("offline");
    },
  });
  const storage = new Storage(request),
    rays = (await trace_known_dynamic_rays(request)).rays;
  const first = storage.save(rays),
    second = storage.save(rays);
  await assert.rejects(first, /offline/);
  await second;
  assert.equal(attempts, 2);
});
