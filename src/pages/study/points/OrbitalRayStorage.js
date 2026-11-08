import DataBackend from "../../../backend/DataBackend.jsx";
import {
  ORBITAL_RAY_CACHE_VERSION,
  orbital_ray_cache_matches,
  orbital_ray_identity,
  merge_orbital_ray_cache,
} from "@fracto/sdk/orbitals/FractoOrbitalRayCache.js";
import { SEED_SURVEY_RAY_OPTIONS } from "@fracto/sdk/orbitals/FractoDynamicRays.js";

const memory = new Map();
let memory_bytes = 0;
const remember = (key, cache) => {
  const bytes = JSON.stringify(cache).length * 2;
  if (memory.has(key)) memory_bytes -= memory.get(key).bytes;
  memory.delete(key);
  if (bytes > 32 * 1024 * 1024) return;
  memory.set(key, { cache, bytes });
  memory_bytes += bytes;
  while (memory.size > 8 || memory_bytes > 32 * 1024 * 1024) {
    const oldest = memory.keys().next().value;
    memory_bytes -= memory.get(oldest).bytes;
    memory.delete(oldest);
  }
};

/** Queued writes retain their original identity even after selection/unmount. */
export default class OrbitalRayStorage {
  constructor(request) {
    this.request = JSON.parse(JSON.stringify(request));
    this.key = JSON.stringify(orbital_ray_identity(this.request));
    this.queue = Promise.resolve();
    this.cache = null;
  }
  async load() {
    if (memory.has(this.key)) {
      this.cache = memory.get(this.key).cache;
      remember(this.key, this.cache);
      return this.cache;
    }
    const { result } = await DataBackend.get_orbital_ray_paths(
      this.request.orbital_id,
      AbortSignal.timeout(5000),
    );
    if (orbital_ray_cache_matches(result, this.request)) {
      this.cache = result;
      remember(this.key, result);
    }
    return this.cache;
  }
  save(rays) {
    const snapshot = JSON.parse(JSON.stringify(rays));
    const operation = this.queue.then(async () => {
      const cache = merge_orbital_ray_cache(this.cache, this.request, snapshot);
      await DataBackend.save_orbital_ray_paths(this.request.orbital_id, {
        version: ORBITAL_RAY_CACHE_VERSION,
        request: this.request,
        quality: SEED_SURVEY_RAY_OPTIONS,
        rays: snapshot,
      });
      this.cache = cache;
      remember(this.key, cache);
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
}
