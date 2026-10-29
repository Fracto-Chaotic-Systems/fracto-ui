import TilesBackend from "../../backend/TilesBackend.jsx";

const aborted = () =>
  Object.assign(new Error("Terrain request superseded"), {
    name: "AbortError",
  });

/** Persistent worker keeps a bounded decoded-tile cache across navigator changes. */
export default class SimulatorMeshLoader {
  constructor({
    create_worker = () =>
      new Worker(new URL("./SimulatorMesh.worker.js", import.meta.url), {
        type: "module",
      }),
    fetch_plan = TilesBackend.mesh_terrain,
    mesh_url = TilesBackend.mesh_url,
  } = {}) {
    Object.assign(this, { create_worker, fetch_plan, mesh_url });
    this.sequence = 0;
  }
  cancel() {
    this.sequence++;
    this.controller?.abort();
    this.worker?.postMessage({ cancel: true });
    this.reject?.(aborted());
    this.reject = null;
  }
  dispose() {
    this.cancel();
    if (this.worker) {
      this.worker.onmessage =
        this.worker.onerror =
        this.worker.onmessageerror =
          null;
      this.worker.terminate();
      this.worker = null;
    }
  }
  async load(params, geometry_keys, on_progress, current_palette_key = null) {
    this.cancel();
    const id = ++this.sequence,
      controller = (this.controller = new AbortController());
    const started = performance.now();
    const timeout = setTimeout(() => {
      if (id !== this.sequence) return;
      controller.abort();
      this.worker?.postMessage({ cancel: true });
      this.reject?.(new Error("Terrain loading timed out"));
    }, 120000);
    try {
      on_progress?.({ stage: "loading", value: null });
      const plan = await this.fetch_plan(params, { signal: controller.signal });
      if (id !== this.sequence) throw aborted();
      if (!plan.tiles.length)
        return {
          plan,
          items: [],
          failures: [],
          cache_hits: 0,
          maximum_height: 0,
          elapsed_ms: Math.round(performance.now() - started),
        };
      if (!this.worker) this.worker = this.create_worker();
      const result = await new Promise((resolve, reject) => {
        this.reject = reject;
        this.worker.onmessage = ({ data }) => {
          if (data.id !== id || id !== this.sequence) return;
          if (data.progress) on_progress?.(data.progress);
          else if (data.error) reject(new Error(data.error));
          else if (data.result) resolve(data.result);
        };
        this.worker.onerror = () => {
          this.worker?.terminate();
          this.worker = null;
          reject(new Error("Terrain worker failed"));
        };
        this.worker.onmessageerror = () =>
          reject(new Error("Invalid terrain response"));
        this.worker.postMessage({
          id,
          plan,
          geometry_keys,
          current_palette_key,
          urls: Object.fromEntries(
            plan.tiles.map((tile) => [
              tile.short_code,
              this.mesh_url(tile.short_code),
            ]),
          ),
        });
      });
      return { ...result, elapsed_ms: Math.round(performance.now() - started) };
    } catch (error) {
      if (id !== this.sequence) throw aborted();
      if (controller.signal.aborted)
        throw new Error("Terrain loading timed out");
      throw error;
    } finally {
      clearTimeout(timeout);
      if (id === this.sequence) {
        this.reject = null;
        this.controller = null;
      }
    }
  }
}
