import { create_flight_tile_cache } from "../src/pages/games/flight/FlightTileCache.js";
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
  for (const width_px of [320, 640, 1280]) {
    const viewport = { width_px, height_px: (width_px * 9) / 16 };
    let frame = pipeline.render(state, viewport);
    for (let warm = 0; warm < 2; warm++)
      frame = pipeline.render(state, viewport, frame.pixels);
    const totals = {
      trace_ms: 0,
      sample_ms: 0,
      fallback_ms: 0,
      color_ms: 0,
      total_ms: 0,
    };
    for (let run = 0; run < 5; run++) {
      frame = pipeline.render(state, viewport, frame.pixels);
      for (const key of Object.keys(totals))
        totals[key] += frame.stats[key] / 5;
    }
    console.log(
      JSON.stringify({
        ...viewport,
        mean_ms: Object.fromEntries(
          Object.entries(totals).map(([key, value]) => [
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
