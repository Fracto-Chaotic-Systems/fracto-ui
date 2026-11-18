import { create_flight_tile_transport } from "./FlightTileTransport.js";
import { create_flight_tile_cache } from "./FlightTileCache.js";
import { create_flight_frame_pipeline } from "./FlightFramePipeline.js";

/** Worker protocol, separately testable without a browser global. */
export function create_flight_worker_runtime(
  post_message,
  {
    create_cache = create_flight_tile_cache,
    create_pipeline = create_flight_frame_pipeline,
    create_transport = create_flight_tile_transport,
  } = {},
) {
  let cache = null,
    pipeline = null,
    expected_bytes = 0;
  const pool = [];
  const destroy = () => {
    pipeline?.destroy();
    cache?.destroy();
    pipeline = cache = null;
    pool.length = 0;
    expected_bytes = 0;
  };
  return {
    receive(message) {
      const id = message?.id ?? null;
      try {
        if (message?.type === "init") {
          destroy();
          cache = create_cache({
            ...message.cache_options,
            ...create_transport(message.tile_service_origin),
          });
          pipeline = create_pipeline(cache, message.pipeline_options);
          post_message({ type: "ready" });
        } else if (message?.type === "render") {
          if (!pipeline) throw new Error("Flight worker is not initialized");
          if (!Number.isSafeInteger(id) || id < 1)
            throw new Error("Invalid flight frame id");
          const bytes =
            message.viewport.width_px * message.viewport.height_px * 4;
          if (bytes !== expected_bytes) {
            pool.length = 0;
            expected_bytes = bytes;
          }
          const frame = pipeline.render(
            message.state,
            message.viewport,
            pool.pop() ?? null,
            message.colors,
          );
          post_message({ type: "frame", id, frame }, [frame.pixels.buffer]);
        } else if (message?.type === "recycle") {
          const pixels = message.pixels;
          if (
            pixels instanceof Uint8ClampedArray &&
            pixels.byteLength === expected_bytes &&
            pixels.byteLength > 0 &&
            pool.length < 2 &&
            !pool.some((item) => item.buffer === pixels.buffer)
          )
            pool.push(pixels);
        } else if (message?.type === "reset") pipeline?.reset();
        else throw new Error("Unknown flight worker message");
      } catch (error) {
        if (message?.type === "init") destroy();
        post_message({
          type: "error",
          id,
          error: { message: error.message, code: error.code ?? null },
        });
      }
    },
    destroy,
    get_stats: () => ({
      recycled_buffers: pool.length,
      initialized: pipeline !== null,
    }),
  };
}
