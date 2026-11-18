/** Pixel budget adaptation, independent of canvas CSS size and instrument layout. */
export function create_flight_resolution({
  target_ms = 32,
  min_pixels = 14400,
  initial_pixels = 57600,
  max_pixels = 518400,
} = {}) {
  if (
    ![target_ms, min_pixels, initial_pixels, max_pixels].every(
      Number.isFinite,
    ) ||
    target_ms <= 0 ||
    min_pixels < 1 ||
    initial_pixels < min_pixels ||
    max_pixels < initial_pixels
  )
    throw new RangeError("Invalid flight resolution budget");
  let budget = initial_pixels,
    average = null,
    good = 0,
    bad = 0,
    warmup = 2;
  return {
    viewport(width, height, dpr = 1) {
      if (
        !Number.isFinite(width) ||
        width <= 0 ||
        !Number.isFinite(height) ||
        height <= 0
      )
        return null;
      const density = Number.isFinite(dpr) ? Math.max(1, Math.min(2, dpr)) : 1;
      const physical_width = width * density,
        physical_height = height * density;
      const scale = Math.min(
        1,
        Math.sqrt(budget / (physical_width * physical_height)),
      );
      return {
        width_px: Math.max(
          1,
          Math.min(Math.floor(budget), Math.floor(physical_width * scale)),
        ),
        height_px: Math.max(
          1,
          Math.min(Math.floor(budget), Math.floor(physical_height * scale)),
        ),
      };
    },
    observe(elapsed_ms) {
      if (!Number.isFinite(elapsed_ms) || elapsed_ms <= 0) return;
      if (warmup) {
        warmup--;
        return;
      }
      average =
        average === null ? elapsed_ms : average * 0.8 + elapsed_ms * 0.2;
      if (average > target_ms * 1.2) {
        bad++;
        good = 0;
      } else if (average < target_ms * 0.75) {
        good++;
        bad = 0;
      } else {
        good = bad = 0;
      }
      if (bad >= 3) {
        budget = Math.max(
          min_pixels,
          Math.floor(budget * Math.max(0.5, target_ms / average)),
        );
        bad = 0;
      } else if (good >= 12) {
        budget = Math.min(max_pixels, Math.floor(budget * 1.2));
        good = 0;
      }
    },
    get_stats: () => ({ pixel_budget: budget, average_ms: average }),
  };
}
