import { create_flight_tile_cache } from "@fracto/sdk/flight/TileCache.js";
import { create_flight_frame_pipeline } from "../src/pages/games/flight/FlightFramePipeline.js";
import { INITIAL_FLIGHT_STATE } from "../src/pages/games/flight/FlightState.js";

// Repeatable CPU baseline: cached level-three data, no network or calculation.
const data = Array.from({ length: 256 }, () => Array(256).fill([2, 10]));
const cache = create_flight_tile_cache({
  load_tile: async (short_code) => ({
    schema_version: 1,
    source_id: "benchmark",
    short_code,
    tile_data: data,
  }),
  load_availability: async (codes) => ({
    schema_version: 1,
    source_id: "benchmark",
    availability: Object.fromEntries(codes.map((code) => [code, true])),
  }),
});
await cache.load("000");
const pipeline = create_flight_frame_pipeline(cache, {
  refinement_options: { max_level: 3 },
  fallback_options: { max_calculations: 0 },
});
const state = {
  ...INITIAL_FLIGHT_STATE,
  position_re: -1.75,
  position_im: 1.75,
  altitude_world: 0.1,
  camera_pitch_deg: -90,
};
try {
  for (const [width_px, height_px] of [
    [320, 180],
    [640, 480],
    [1280, 720],
  ]) {
    const modes = [0, 0.35].map((fisheye_strength) => ({
      viewport: { width_px, height_px, fisheye_strength },
      totals: {
        trace_ms: 0,
        sample_ms: 0,
        fallback_ms: 0,
        color_ms: 0,
        total_ms: 0,
      },
      samples: [],
    }));
    let frame = pipeline.render(state, modes[0].viewport);
    for (let warm = 0; warm < 30; warm++)
      frame = pipeline.render(state, modes[warm % 2].viewport, frame.pixels);
    // Alternate order each pair so neither lens consistently benefits from warmup.
    for (let run = 0; run < 15; run++)
      for (const mode of run % 2 ? [...modes].reverse() : modes) {
        frame = pipeline.render(state, mode.viewport, frame.pixels);
        mode.samples.push(frame.stats.total_ms);
        for (const key of Object.keys(mode.totals))
          mode.totals[key] += frame.stats[key] / 15;
      }
    for (const mode of modes)
      console.log(
        JSON.stringify({
          ...mode.viewport,
          median_total_ms: Number(
            mode.samples.sort((a, b) => a - b)[7].toFixed(2),
          ),
          mean_ms: Object.fromEntries(
            Object.entries(mode.totals).map(([key, value]) => [
              key,
              Number(value.toFixed(2)),
            ]),
          ),
        }),
      );
  }
} finally {
  pipeline.destroy();
  cache.destroy();
}
