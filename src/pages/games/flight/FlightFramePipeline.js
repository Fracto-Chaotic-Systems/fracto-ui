import {
  create_flight_projection,
  create_flight_intersections,
  trace_flight_frame,
} from "./FlightProjection.js";
import {
  create_flight_refinement,
  create_flight_sample_buffer,
} from "./FlightRefinement.js";
import { create_flight_frame_fallback } from "./FlightFrameFallback.js";
import { color_flight_frame } from "./FlightFrameColors.js";

/** Persistent numerical and coloring pipeline; production runs it in a worker. */
export function create_flight_frame_pipeline(
  cache,
  {
    refinement_options = {},
    fallback_options = {},
    max_pixels = 4194304,
    now = () => performance.now(),
  } = {},
) {
  if (!Number.isSafeInteger(max_pixels) || max_pixels <= 0)
    throw new RangeError("Invalid flight pixel limit");
  const refinement = create_flight_refinement(cache, refinement_options);
  const fallback = create_flight_frame_fallback(fallback_options);
  let intersections = null,
    samples = null,
    destroyed = false,
    source_id = cache.get_stats().source_id;
  const reset = () => {
    refinement.reset();
    fallback.reset();
  };
  return {
    render(state, viewport, pixels = null, colors = {}) {
      if (destroyed) throw new Error("Flight frame pipeline destroyed");
      const start = now(),
        projection = create_flight_projection(state, viewport);
      if (projection.width_px * projection.height_px > max_pixels)
        throw new RangeError("Flight frame exceeds pixel budget");
      const current_source = cache.get_stats().source_id;
      if (source_id !== current_source) {
        reset();
        source_id = current_source;
      }
      const { width_px, height_px } = projection;
      if (
        intersections?.width_px !== width_px ||
        intersections?.height_px !== height_px
      ) {
        intersections = create_flight_intersections(width_px, height_px);
        samples = create_flight_sample_buffer(width_px, height_px);
        fallback.reset();
      }
      trace_flight_frame(projection, intersections);
      const traced = now();
      refinement.sample(intersections, samples);
      const sampled = now(),
        calculations = fallback.apply(intersections, samples);
      const calculated = now(),
        rgba = color_flight_frame(samples, intersections.kinds, pixels, colors);
      const finished = now();
      return {
        width_px,
        height_px,
        pixels: rgba,
        stats: {
          source_id,
          trace_ms: traced - start,
          sample_ms: sampled - traced,
          fallback_ms: calculated - sampled,
          color_ms: finished - calculated,
          total_ms: finished - start,
          calculations,
          duplicates: samples.duplicate_count,
          max_depth_duplicates: samples.max_depth_duplicate_count,
          catalog_limited: samples.catalog_limited,
          refinement: refinement.get_stats(),
          cache: cache.get_stats(),
        },
      };
    },
    settled: () => refinement.settled(),
    reset,
    destroy() {
      if (!destroyed) {
        destroyed = true;
        refinement.destroy();
        fallback.reset();
        intersections = samples = null;
      }
    },
  };
}
