import DataBackend from "../../../backend/DataBackend.jsx";
import {
  RAY_CACHE_VERSION,
  ray_cache_matches,
} from "@fracto/sdk/orbitals/FractoMinibrotRayCache.js";

/** Immutable record identity; saves already queued survive a canvas unmount. */
export default class MinibrotRayStorage {
  constructor({ minibrot_id, core_point, period, scope }) {
    this.id = minibrot_id;
    this.core = JSON.parse(JSON.stringify(core_point));
    this.period = period;
    this.tolerance = scope / 1000;
    this.queue = Promise.resolve();
  }
  async load() {
    const { result } = await DataBackend.get_minibrot_ray_paths(
      this.id,
      AbortSignal.timeout(5000),
    );
    return ray_cache_matches(result, this.core, this.period) ? result : null;
  }
  save(group, result) {
    const operation = this.queue.then(() =>
      DataBackend.save_minibrot_ray_paths(this.id, {
        version: RAY_CACHE_VERSION,
        core_point: this.core,
        period: this.period,
        tolerance: this.tolerance,
        group,
        result,
      }),
    );
    this.queue = operation.catch(() => {});
    return operation;
  }
}
