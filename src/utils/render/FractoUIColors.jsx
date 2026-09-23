import SdkFractoColors, {
  GREY_BASE,
  GREY_RANGE,
} from "@fracto/sdk/FractoColors.js";

const ONE_BY_LOG_TEN_THOUSAND = 1 / Math.log(10000);
const ONE_BY_LOG_ONE_MILLION = 1 / Math.log(1000000);

/** UI-specific color presentation helpers built on the shared SDK colors. */
export class FractoUIColors {
  static pattern_hue = SdkFractoColors.pattern_hue;
  static get_greys_map = SdkFractoColors.get_greys_map;
  static get_heat_map_greys_palette =
    SdkFractoColors.get_heat_map_greys_palette;
  static get_heat_map_greys_map = SdkFractoColors.get_heat_map_greys_map;

  /** Number of iterations used by the UI's color presentation. */
  static FRACTO_COLOR_ITERATIONS = 255;

  static color_cache = {};
  static color_cache_size = 0;

  /**
   * Returns the UI HSL tuple for a pattern and iteration count.
   *
   * @param {number} pattern pattern/cardinality identifier
   * @param {number} iterations iteration count used for luminosity
   * @returns {[number, number, number]} HSL components
   */
  static fracto_pattern_color_hsl = (
    pattern,
    iterations = FractoUIColors.FRACTO_COLOR_ITERATIONS,
  ) => {
    if (pattern === -1) {
      return [0, 0, 0];
    }
    const cache_key = `(${pattern},${iterations})`;
    if (FractoUIColors.color_cache[cache_key]) {
      return FractoUIColors.color_cache[cache_key];
    }
    if (pattern === 0) {
      const offset = Math.log(iterations) * ONE_BY_LOG_TEN_THOUSAND;
      const lum_pct = Math.round(100 * (1.0 - offset));
      FractoUIColors.color_cache[cache_key] = [0, 0, lum_pct];
      FractoUIColors.color_cache_size++;
      return FractoUIColors.color_cache[cache_key];
    }

    const log2 = Math.log2(pattern);
    const hue = 360 * (log2 - Math.floor(log2));
    const lum = 0.15 + 0.75 * Math.log(iterations) * ONE_BY_LOG_ONE_MILLION;
    FractoUIColors.color_cache[cache_key] = [Math.round(hue), 75, Math.round(100 * lum)];
    FractoUIColors.color_cache_size++;
    return FractoUIColors.color_cache[cache_key];
  };

  static pattern_color_hsl = (pattern, iteration) =>
    FractoUIColors.fracto_pattern_color_hsl(pattern, iteration);

  static pattern_color = (pattern, sat_pct = 50, lum_pct = 50) => {
    const log2 = Math.log2(pattern);
    const hue = pattern ? 360 * (log2 - Math.floor(log2)) : 0;
    return `hsl(${hue}, ${sat_pct}%, ${lum_pct}%)`;
  };

  // Keep the cache bounded without keeping short-lived consumers alive.
  static cache_cleanup_interval = setInterval(() => {
    if (FractoUIColors.color_cache_size > 500000) {
      FractoUIColors.color_cache = {};
      FractoUIColors.color_cache_size = 0;
    }
  }, 10000);
}

if (typeof FractoUIColors.cache_cleanup_interval.unref === "function") {
  FractoUIColors.cache_cleanup_interval.unref();
}

export { GREY_BASE, GREY_RANGE };
export default FractoUIColors;
