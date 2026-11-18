const abort_error = () =>
  Object.assign(new Error("Flight frame superseded or cancelled"), {
    name: "AbortError",
  });

/** One in-flight render and one latest queued view. Release frames after painting
 * to transfer their RGBA storage back into the worker's bounded buffer pool.
 */
export function create_flight_frame_session(worker, initialization) {
  let sequence = 0,
    active = null,
    queued = null,
    destroyed = false;
  const owned = new WeakSet();
  const reject = (job, error) => {
    if (job && !job.done) {
      job.done = true;
      job.reject(error);
    }
  };
  const recycle = (frame) => {
    if (
      !destroyed &&
      frame?.pixels instanceof Uint8ClampedArray &&
      frame.pixels.byteLength
    ) {
      try {
        worker.postMessage({ type: "recycle", pixels: frame.pixels }, [
          frame.pixels.buffer,
        ]);
      } catch (error) {
        fail(error);
      }
    }
  };
  const fail = (error) => {
    if (destroyed) return;
    destroyed = true;
    reject(active, error);
    reject(queued, error);
    active = queued = null;
    worker.removeEventListener("message", receive);
    worker.removeEventListener("error", on_error);
    worker.removeEventListener("messageerror", on_error);
    worker.terminate();
  };
  const send = (job) => {
    active = job;
    try {
      worker.postMessage({
        type: "render",
        id: job.id,
        state: job.state,
        viewport: job.viewport,
        colors: job.colors,
      });
    } catch (error) {
      fail(error);
    }
  };
  const receive = ({ data }) => {
    if (destroyed || data?.type === "ready") return;
    if (data?.type === "error" && data.id === null) {
      fail(new Error(data.error?.message ?? "Flight worker failed"));
      return;
    }
    if (!active || data?.id !== active.id) {
      if (data?.type === "frame") recycle(data.frame);
      return;
    }
    if (data.type === "error") {
      reject(
        active,
        Object.assign(new Error(data.error?.message ?? "Flight frame failed"), {
          code: data.error?.code,
        }),
      );
    } else if (data.type === "frame") {
      const frame = data.frame;
      if (
        !(frame?.pixels instanceof Uint8ClampedArray) ||
        frame.pixels.length !==
          active.viewport.width_px * active.viewport.height_px * 4 ||
        frame.width_px !== active.viewport.width_px ||
        frame.height_px !== active.viewport.height_px
      ) {
        fail(new Error("Invalid flight worker frame"));
        return;
      }
      if (active.id === sequence && !active.done) {
        active.done = true;
        owned.add(frame);
        active.resolve(frame);
      } else recycle(frame);
    } else {
      fail(new Error("Invalid flight worker response"));
      return;
    }
    active = null;
    if (queued) {
      const next = queued;
      queued = null;
      send(next);
    }
  };
  const on_error = (event) =>
    fail(new Error(event.message ?? "Flight worker transport failed"));
  worker.addEventListener("message", receive);
  worker.addEventListener("error", on_error);
  worker.addEventListener("messageerror", on_error);
  try {
    worker.postMessage({ ...initialization, type: "init" });
  } catch (error) {
    fail(error);
    throw error;
  }
  return {
    render(state, viewport, colors = {}) {
      if (destroyed)
        return Promise.reject(new Error("Flight frame session destroyed"));
      return new Promise((resolve, reject_promise) => {
        const state_copy = { ...state },
          viewport_copy = { ...viewport },
          colors_copy = structuredClone(colors);
        const job = {
          id: ++sequence,
          state: state_copy,
          viewport: viewport_copy,
          colors: colors_copy,
          resolve,
          reject: reject_promise,
          done: false,
        };
        reject(active, abort_error());
        reject(queued, abort_error());
        if (active) queued = job;
        else send(job);
      });
    },
    release(frame) {
      if (!owned.has(frame)) return false;
      owned.delete(frame);
      recycle(frame);
      return true;
    },
    cancel() {
      if (destroyed) return;
      sequence++;
      reject(active, abort_error());
      reject(queued, abort_error());
      queued = null;
      try {
        worker.postMessage({ type: "reset" });
      } catch (error) {
        fail(error);
      }
    },
    destroy() {
      fail(abort_error());
    },
    get_stats: () => ({
      active: active !== null,
      queued: queued !== null,
      destroyed,
    }),
  };
}
