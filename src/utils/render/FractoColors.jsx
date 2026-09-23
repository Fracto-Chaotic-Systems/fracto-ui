const MAX_PATTERN = 20000;
export const GREY_BASE = 50;
export const GREY_RANGE = 255 - GREY_BASE;
const COLOR_LUM_BASE_PCT = 15;
const COLOR_LUM_BASE_RANGE_PCT = 40;

const ONE_BY_LOG_TEN_THOUSAND = 1 / Math.log(10000);
const ONE_BY_LOG_ONE_MILLION = 1 / Math.log(1000000);

var COLOR_CACHE = {};
var CACHE_SIZE = 0;

export const FRACTO_COLOR_ITERATIONS = 255;

setInterval(() => {
  if (CACHE_SIZE > 500000) {
    console.log("resetting COLOR_CACHE");
    const color_keys = Object.keys(COLOR_CACHE);
    for (let i = 0; i < color_keys.length; i++) {
      delete COLOR_CACHE[color_keys[i]];
    }
    COLOR_CACHE = {};
    CACHE_SIZE = 0;
  }
}, 10000);

export class FractoColors {
  static pattern_hues = null;

  static init_pattern_hues = () => {
    // Precompute log2 values for better performance
    const pattern_hues = new Array(MAX_PATTERN);
    pattern_hues[0] = 0;
    for (let pattern = 1; pattern < MAX_PATTERN; pattern++) {
      const log2 = Math.log2(pattern);
      pattern_hues[pattern] = Math.floor(360 * (log2 - Math.floor(log2)));
    }
    FractoColors.pattern_hues = pattern_hues;
  };

  static pattern_hue = (pattern) => {
    if (!FractoColors.pattern_hues) {
      FractoColors.init_pattern_hues();
    }
    let pattern_in_range = pattern;
    while (pattern_in_range > MAX_PATTERN) {
      pattern_in_range = Math.floor(pattern_in_range / 2);
    }
    return FractoColors.pattern_hues[pattern_in_range];
  };

  static fracto_pattern_color_hsl = (
    pattern,
    iterations = FRACTO_COLOR_ITERATIONS,
    distance_to_center = 0,
  ) => {
    if (pattern === -1) {
      return [0, 0, 0];
    }
    const cache_key = `(${pattern},${iterations})`;
    if (COLOR_CACHE[cache_key]) {
      return COLOR_CACHE[cache_key];
    }
    if (pattern === 0) {
      let offset = Math.log(iterations) * ONE_BY_LOG_TEN_THOUSAND;
      // if (iterations < 21) {
      //    offset *= 0.9;
      // }
      const lum = 1.0 - offset;
      const lum_pct = Math.round(100 * lum);
      COLOR_CACHE[cache_key] = [0, 0, lum_pct];
      CACHE_SIZE++;
      return COLOR_CACHE[cache_key];
    }

    const log2 = Math.log2(pattern);
    const hue = pattern ? 360 * (log2 - Math.floor(log2)) : 0;
    const lum = 0.15 + 0.75 * Math.log(iterations) * ONE_BY_LOG_ONE_MILLION;

    const lum_pct = Math.round(100 * lum);
    COLOR_CACHE[cache_key] = [Math.round(hue), 75, lum_pct];
    CACHE_SIZE++;
    return COLOR_CACHE[cache_key];
  };

  static pattern_color_hsl = (pattern, iteration) => {
    return FractoColors.fracto_pattern_color_hsl(pattern, iteration);
  };

  static pattern_color = (pattern, sat_pct = 50, lum_pct = 50) => {
    const log2 = Math.log2(pattern);
    const hue = pattern ? 360 * (log2 - Math.floor(log2)) : 0;
    return `hsl(${hue}, ${sat_pct}%, ${lum_pct}%)`;
  };

  static get_greys_map = (
    all_pixels,
    all_sets_object,
    base_value,
    range_value,
  ) => {
    const total_pixels = all_pixels.length;
    // Convert object to sorted array only once
    const all_sets = Object.keys(all_sets_object)
      .map((key) => {
        const iteration = parseInt(key.slice(1));
        return { iteration, iteration_count: all_sets_object[key] };
      })
      .sort((a, b) => a.iteration - b.iteration);
    let best_bin_size = total_pixels / range_value;
    let current_grey_tone = base_value + range_value;
    let current_bin_size = 0;
    let total_pixel_count = 0;
    for (let i = 0; i < all_sets.length; i++) {
      const set = all_sets[i];
      if (set.iteration_count > best_bin_size) {
        let reduce_by = Math.floor(set.iteration_count / best_bin_size);
        const threshhold = (current_grey_tone - base_value) / 10;
        if (reduce_by > threshhold) {
          reduce_by = Math.round(threshhold) + 1;
        }
        current_grey_tone -= reduce_by;
        current_bin_size = 0;
      } else if (set.iteration_count + current_bin_size < best_bin_size) {
        current_bin_size += set.iteration_count;
      } else {
        current_bin_size = set.iteration_count;
        current_grey_tone -= 1;
      }
      total_pixel_count += set.iteration_count;
      set.grey_tone = current_grey_tone;
      const remaining_bins = current_grey_tone - base_value + 1;
      best_bin_size = (total_pixels - total_pixel_count) / remaining_bins;
    }
    const greys_map = {};
    for (let i = 0; i < all_sets.length; i++) {
      const set = all_sets[i];
      greys_map[`_${set.iteration}`] = set.grey_tone;
    }
    return greys_map;
  };

  /**
   * Creates an ordered heat-map palette containing the requested number of
   * grey shades. The spectrum is divided into `shade_count + 1` equal spaces,
   * within the 25%–95% portion of the grayscale range, so the shades remain
   * visible without approaching pure black or pure white. Levels are ordered
   * from light to dark to preserve the heat-map convention that lower levels
   * are lighter. A single shade is centered at mid-grey.
   */
  static get_heat_map_greys_palette = (shade_count) => {
    const count = Math.max(0, Math.floor(Number(shade_count) || 0));
    if (!count) {
      return [];
    }
    const min_grey = 255 * 0.25;
    const max_grey = 255 * 0.95;
    const step = (max_grey - min_grey) / (count + 1);
    return Array.from({ length: count }, (_, index) =>
      Math.round(max_grey - step * (index + 1)),
    );
  };

  /**
   * Assigns clearly separated grey shades to the levels represented in a
   * heat-map buffer. The palette depends only on the number of distinct
   * levels, while the buffer determines which level receives each shade.
   */
  static get_heat_map_greys_map = (canvas_buffer) => {
    const levels = new Set();
    for (const column of canvas_buffer || []) {
      for (const point of column || []) {
        if (point) {
          levels.add(Math.abs(point[1] || 0));
        }
      }
    }
    const sorted_levels = Array.from(levels).sort((left, right) => left - right);
    if (!sorted_levels.length) {
      return {};
    }
    const palette = FractoColors.get_heat_map_greys_palette(
      sorted_levels.length,
    );
    return Object.fromEntries(
      sorted_levels.map((level, index) => [
        `_${level}`,
        palette[index],
      ]),
    );
  };

}

export default FractoColors;
