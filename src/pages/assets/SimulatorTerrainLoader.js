/** One disposable worker per stage. Cancellation also releases parsing/build memory. */
export default class SimulatorTerrainLoader {
  constructor(create_worker = () => new Worker(new URL("./SimulatorTerrain.worker.js", import.meta.url), { type: "module" })) {
    this.create_worker = create_worker;
  }

  cancel() {
    this.worker?.terminate();
    this.worker = null;
    if (this.reject) {
      const error = new Error("Terrain request superseded");
      error.name = "AbortError";
      this.reject(error);
      this.reject = null;
    }
  }

  load(request, transfers = [], on_progress) {
    this.cancel();
    return new Promise((resolve, reject) => {
      const worker = this.create_worker();
      this.worker = worker;
      this.reject = reject;
      const finish = (error, result) => {
        if (this.worker !== worker) return;
        this.worker = null;
        this.reject = null;
        worker.terminate();
        if (error) reject(error); else resolve(result);
      };
      worker.onmessage = ({ data }) => {
        if (this.worker !== worker) return;
        if (data.progress) {
          try { on_progress?.(data.progress); } catch (error) { finish(error); }
          return;
        }
        finish(data.error ? new Error(data.error) : null, data);
      };
      worker.onerror = (event) => finish(new Error(event.message || "Terrain worker failed"));
      worker.onmessageerror = () => finish(new Error("Terrain worker response could not be read"));
      try { worker.postMessage(request, transfers); } catch (error) { finish(error); }
    });
  }
}
