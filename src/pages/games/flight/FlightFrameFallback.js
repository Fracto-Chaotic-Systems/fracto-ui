import FractoFastCalc from "@fracto/sdk/FractoFastCalc.js";
import { FLIGHT_RAY_PLANE } from "./FlightProjection.js";

// Same zero seed, iteration numbering and radius-10 escape test as the SDK.
// Zero means the short prefix did not establish escape; it is not a set-membership result.
export function flight_escape_prefix(re, im, limit = 16) {
  if (!Number.isFinite(re) || !Number.isFinite(im))
    throw new TypeError("Invalid escape coordinates");
  if (!Number.isInteger(limit) || limit < 0 || limit > 256)
    throw new RangeError("Invalid escape prefix limit");
  let x = 0,
    y = 0,
    xx = 0,
    yy = 0;
  for (let iteration = 1; iteration <= limit; iteration++) {
    y = 2 * x * y + im;
    x = xx - yy + re;
    xx = x * x;
    yy = y * y;
    if (xx + yy > 100) return iteration;
  }
  return 0;
}

/** Bounded zero-seed calculation for plane pixels without a valid tile sample.
 * Results are memoized by pixel and exact world coordinate, not by rounded view.
 */
export function create_flight_frame_fallback({
  max_calculations = 2048,
  budget_ms = 4,
  iteration_limit = 10000,
  escape_iterations = 16,
  now = () => performance.now(),
  calculate = (re, im, limit) =>
    FractoFastCalc.calc_from_seed(re, im, 0, 0, 10, limit),
} = {}) {
  if (
    !Number.isSafeInteger(max_calculations) ||
    max_calculations < 0 ||
    !Number.isFinite(budget_ms) ||
    budget_ms < 0 ||
    !Number.isSafeInteger(iteration_limit) ||
    iteration_limit < 5000 ||
    !Number.isSafeInteger(escape_iterations) ||
    escape_iterations < 0 ||
    escape_iterations > 256
  )
    throw new RangeError("Invalid flight calculation budget");
  let re_cache, im_cache, values, valid;
  const reset = () => {
    re_cache = im_cache = values = valid = null;
  };
  return {
    reset,
    apply(intersections, samples) {
      const count = intersections.kinds.length;
      if (
        samples.width_px !== intersections.width_px ||
        samples.height_px !== intersections.height_px ||
        !(samples.values instanceof Float64Array) ||
        samples.values.length !== count * 2
      )
        throw new RangeError("Flight fallback buffers do not match");
      if (valid && valid.length !== count) reset();
      let calculation_ms = 0,
        calculated = 0,
        reused = 0,
        fast_escaped = 0,
        unresolved = 0,
        limited = 0,
        errors = 0;
      for (let pixel = 0; pixel < count; pixel++) {
        if (intersections.kinds[pixel] !== FLIGHT_RAY_PLANE) continue;
        if (
          Number.isFinite(samples.values[pixel * 2]) &&
          Number.isFinite(samples.values[pixel * 2 + 1])
        )
          continue;
        if (!valid) {
          valid = new Uint8Array(count);
          re_cache = new Float64Array(count);
          im_cache = new Float64Array(count);
          values = new Float64Array(count * 2);
        }
        const re = intersections.position_re[pixel],
          im = intersections.position_im[pixel];
        const same =
          valid[pixel] && re_cache[pixel] === re && im_cache[pixel] === im;
        if (same) reused++;
        else {
          valid[pixel] = 0;
          if (!Number.isFinite(re) || !Number.isFinite(im)) {
            unresolved++;
            continue;
          }
          re_cache[pixel] = re;
          im_cache[pixel] = im;
          const escape =
            max_calculations > 0
              ? flight_escape_prefix(re, im, escape_iterations)
              : 0;
          if (escape) {
            valid[pixel] = 1;
            values[pixel * 2] = 0;
            values[pixel * 2 + 1] = escape;
            fast_escaped++;
          } else valid[pixel] = 4;
        }
        if (valid[pixel] === 4) {
          if (calculated >= max_calculations || calculation_ms >= budget_ms) {
            unresolved++;
            continue;
          }
          calculated++;
          const start = now();
          try {
            const result = calculate(re, im, iteration_limit);
            if (
              Number.isSafeInteger(result?.pattern) &&
              Number.isFinite(result?.iteration) &&
              !result.estimated
            ) {
              valid[pixel] = 1;
              values[pixel * 2] = result.pattern;
              values[pixel * 2 + 1] = result.iteration;
            } else valid[pixel] = 2;
          } catch {
            valid[pixel] = 3;
          } finally {
            calculation_ms += Math.max(0, now() - start);
          }
        }
        if (valid[pixel] === 1) {
          samples.values[pixel * 2] = values[pixel * 2];
          samples.values[pixel * 2 + 1] = values[pixel * 2 + 1];
        } else {
          unresolved++;
          if (valid[pixel] === 2) limited++;
          else errors++;
        }
      }
      samples.unresolved_count = unresolved;
      return {
        calculated,
        reused,
        fast_escaped,
        unresolved,
        limited,
        errors,
        calculation_ms,
      };
    },
  };
}
