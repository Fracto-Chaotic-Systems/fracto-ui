import FractoColors, {
  GREY_BASE,
  GREY_RANGE,
} from "@fracto/sdk/FractoColors.js";
import {
  FLIGHT_RAY_PLANE,
  FLIGHT_RAY_SKY,
  FLIGHT_RAY_HORIZON,
} from "./FlightProjection.js";

export const DEFAULT_FLIGHT_FRAME_COLORS = Object.freeze({
  sky: Object.freeze([145, 190, 222, 255]),
  horizon: Object.freeze([205, 220, 230, 255]),
  unresolved: Object.freeze([28, 32, 38, 255]),
});

function validate_frame(samples, kinds) {
  const count = samples.width_px * samples.height_px;
  if (
    !Number.isSafeInteger(samples.width_px) ||
    samples.width_px <= 0 ||
    !Number.isSafeInteger(samples.height_px) ||
    samples.height_px <= 0 ||
    !(samples.values instanceof Float64Array) ||
    samples.values.length !== count * 2 ||
    !(kinds instanceof Uint8Array) ||
    kinds.length !== count
  )
    throw new RangeError("Invalid flight color frame");
  return count;
}

/** The SDK tone algorithm, applied once to all valid plane samples in this frame. */
export function build_flight_palette(samples, kinds) {
  const count = validate_frame(samples, kinds);
  const bins = { escaped: {}, inner: {}, outer: {} };
  const totals = { escaped: 0, inner: 0, outer: 0 };
  let last_category = null,
    last_iteration = null,
    run = 0;
  const flush = () => {
    if (!run) return;
    const key = `_${last_iteration}`;
    bins[last_category][key] = (bins[last_category][key] ?? 0) + run;
    totals[last_category] += run;
  };
  for (let pixel = 0; pixel < count; pixel++) {
    const pattern = samples.values[pixel * 2],
      iteration = samples.values[pixel * 2 + 1];
    if (
      kinds[pixel] !== FLIGHT_RAY_PLANE ||
      !Number.isSafeInteger(pattern) ||
      !Number.isFinite(iteration)
    )
      continue;
    const category =
      pattern === 0 ? "escaped" : pattern < 0 ? "inner" : "outer";
    const absolute = Math.abs(iteration);
    if (category === last_category && absolute === last_iteration) run++;
    else {
      flush();
      last_category = category;
      last_iteration = absolute;
      run = 1;
    }
  }
  flush();
  return Object.fromEntries(
    Object.keys(bins).map((category) => [
      category,
      FractoColors.get_greys_map(
        { length: totals[category] },
        bins[category],
        category === "escaped" ? GREY_BASE : 15,
        category === "escaped" ? GREY_RANGE : 40,
      ),
    ]),
  );
}

function pattern_rgb(pattern, tone) {
  const h = FractoColors.pattern_hue(Math.abs(pattern)) / 60;
  const light = Math.max(0, Math.min(1, (100 - tone) / 100));
  const chroma = (1 - Math.abs(2 * light - 1)) * 0.8;
  const x = chroma * (1 - Math.abs((h % 2) - 1)),
    m = light - chroma / 2;
  const sector = Math.floor(h);
  const rgb =
    sector === 0
      ? [chroma, x, 0]
      : sector === 1
        ? [x, chroma, 0]
        : sector === 2
          ? [0, chroma, x]
          : sector === 3
            ? [0, x, chroma]
            : sector === 4
              ? [x, 0, chroma]
              : [chroma, 0, x];
  return rgb.map((value) => Math.round((value + m) * 255));
}

/** Produces one opaque RGBA pixel per ray. Numerical inputs remain unchanged. */
export function color_flight_frame(samples, kinds, output = null, colors = {}) {
  const count = validate_frame(samples, kinds);
  const pixels = output ?? new Uint8ClampedArray(count * 4);
  if (!(pixels instanceof Uint8ClampedArray) || pixels.length !== count * 4)
    throw new RangeError("Invalid flight RGBA buffer");
  const background = {};
  for (const key of Object.keys(DEFAULT_FLIGHT_FRAME_COLORS)) {
    const rgba = colors[key] ?? DEFAULT_FLIGHT_FRAME_COLORS[key];
    if (
      !Array.isArray(rgba) ||
      rgba.length !== 4 ||
      !rgba.every(
        (value) => Number.isInteger(value) && value >= 0 && value <= 255,
      )
    )
      throw new RangeError("Invalid flight background color");
    background[key] = rgba;
  }
  const palette = build_flight_palette(samples, kinds),
    color_cache = new Map();
  let last_pattern = NaN,
    last_iteration = NaN,
    last_rgba = null;
  for (let pixel = 0; pixel < count; pixel++) {
    const kind = kinds[pixel],
      pattern = samples.values[pixel * 2],
      iteration = samples.values[pixel * 2 + 1];
    let rgba =
      kind === FLIGHT_RAY_SKY
        ? background.sky
        : kind === FLIGHT_RAY_HORIZON
          ? background.horizon
          : background.unresolved;
    if (
      kind === FLIGHT_RAY_PLANE &&
      Number.isSafeInteger(pattern) &&
      Number.isFinite(iteration)
    ) {
      const absolute = Math.abs(iteration);
      if (last_pattern === pattern && last_iteration === absolute)
        rgba = last_rgba;
      else {
        const category =
          pattern === 0 ? "escaped" : pattern < 0 ? "inner" : "outer";
        const key = `_${absolute}`,
          tone = palette[category][key];
        if (pattern === 0) rgba = [tone, tone, tone, 255];
        else {
          const color_key = `${category}:${Math.abs(pattern)}:${key}`;
          rgba = color_cache.get(color_key);
          if (!rgba) {
            rgba = [...pattern_rgb(pattern, tone), 255];
            if (color_cache.size < 4096) color_cache.set(color_key, rgba);
          }
        }
        last_pattern = pattern;
        last_iteration = absolute;
        last_rgba = rgba;
      }
    }
    const offset = pixel * 4;
    pixels[offset] = rgba[0];
    pixels[offset + 1] = rgba[1];
    pixels[offset + 2] = rgba[2];
    pixels[offset + 3] = rgba[3];
  }
  return pixels;
}
