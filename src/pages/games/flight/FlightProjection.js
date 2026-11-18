// World axes: real/east, imaginary/north, altitude/up. Raster origin: top left.
export const FLIGHT_RAY_SKY = 0;
export const FLIGHT_RAY_HORIZON = 1;
export const FLIGHT_RAY_PLANE = 2;
export const FLIGHT_RAY_UNREPRESENTABLE = 3;
export const DEFAULT_FLIGHT_VERTICAL_FOV_DEG = 60;
export const FLIGHT_HORIZON_EPSILON = 1e-12;

const RAD = Math.PI / 180;

/** Compile a flight snapshot into a plain, worker-transferable pinhole camera. */
export function create_flight_projection(
  state,
  { width_px, height_px, vertical_fov_deg = DEFAULT_FLIGHT_VERTICAL_FOV_DEG },
) {
  if (
    !Number.isSafeInteger(width_px) ||
    width_px <= 0 ||
    !Number.isSafeInteger(height_px) ||
    height_px <= 0 ||
    !Number.isSafeInteger(width_px * height_px)
  )
    throw new RangeError(
      "Flight raster dimensions must be positive safe integers",
    );
  if (
    !Number.isFinite(vertical_fov_deg) ||
    vertical_fov_deg <= 0 ||
    vertical_fov_deg >= 180
  )
    throw new RangeError(
      "Flight vertical field of view must be between 0 and 180 degrees",
    );
  for (const key of [
    "position_re",
    "position_im",
    "altitude_world",
    "camera_heading_deg",
    "camera_pitch_deg",
  ])
    if (!Number.isFinite(state?.[key]))
      throw new TypeError(`Invalid flight camera field: ${key}`);
  if (state.altitude_world <= 0 || Math.abs(state.camera_pitch_deg) > 90)
    throw new RangeError(
      "Flight camera must be above the plane with pitch between -90 and 90 degrees",
    );
  const heading = (((state.camera_heading_deg % 360) + 360) % 360) * RAD;
  const pitch = state.camera_pitch_deg * RAD;
  const sin_heading = Math.sin(heading),
    cos_heading = Math.cos(heading);
  // Exact poles avoid introducing a false horizontal component through cos(pi/2).
  const cos_pitch =
    Math.abs(state.camera_pitch_deg) === 90 ? 0 : Math.cos(pitch);
  const sin_pitch = Math.sin(pitch);
  const half_height = Math.tan((vertical_fov_deg * RAD) / 2);
  const pixel_step = (2 * half_height) / height_px;
  if (!Number.isFinite(pixel_step * width_px) || pixel_step === 0)
    throw new RangeError("Flight projection scale is not representable");
  return Object.freeze({
    width_px,
    height_px,
    vertical_fov_deg,
    pixel_step,
    origin: Object.freeze({
      re: state.position_re,
      im: state.position_im,
      up: state.altitude_world,
    }),
    forward: Object.freeze({
      re: sin_heading * cos_pitch,
      im: cos_heading * cos_pitch,
      up: sin_pitch,
    }),
    right: Object.freeze({ re: cos_heading, im: -sin_heading, up: 0 }),
    up: Object.freeze({
      re: -sin_heading * sin_pitch,
      im: -cos_heading * sin_pitch,
      up: cos_pitch,
    }),
  });
}

/** Unit ray through a pixel center; craft attitude never changes the camera. */
export function flight_ray_for_pixel(projection, x, y) {
  if (
    !Number.isInteger(x) ||
    x < 0 ||
    x >= projection.width_px ||
    !Number.isInteger(y) ||
    y < 0 ||
    y >= projection.height_px
  )
    throw new RangeError("Flight pixel is outside the raster");
  const horizontal =
    (x + 0.5 - projection.width_px / 2) * projection.pixel_step;
  const vertical = (projection.height_px / 2 - y - 0.5) * projection.pixel_step;
  const { forward, right, up } = projection;
  const re = forward.re + horizontal * right.re + vertical * up.re;
  const im = forward.im + horizontal * right.im + vertical * up.im;
  const z = forward.up + vertical * up.up;
  const length = Math.hypot(re, im, z);
  return { re: re / length, im: im / length, up: z / length };
}

function ray_kind(re, im, up) {
  // Relative angular tolerance works for unnormalized rays, avoiding a sqrt per pixel.
  if (up * up <= FLIGHT_HORIZON_EPSILON ** 2 * (re * re + im * im + up * up))
    return FLIGHT_RAY_HORIZON;
  return up > 0 ? FLIGHT_RAY_SKY : FLIGHT_RAY_PLANE;
}

/** Inspect one ray. Misses carry no coordinates; plane hits include world distance. */
export function trace_flight_pixel(projection, x, y) {
  const ray = flight_ray_for_pixel(projection, x, y);
  const kind = ray_kind(ray.re, ray.im, ray.up);
  if (kind !== FLIGHT_RAY_PLANE) return { kind };
  const distance_world = -projection.origin.up / ray.up;
  const position_re = projection.origin.re + distance_world * ray.re;
  const position_im = projection.origin.im + distance_world * ray.im;
  if (![distance_world, position_re, position_im].every(Number.isFinite))
    return { kind: FLIGHT_RAY_UNREPRESENTABLE };
  return { kind, position_re, position_im, distance_world };
}

/** Allocate a row-major intersection buffer, reusable for any raster of this size. */
export function create_flight_intersections(width_px, height_px) {
  if (
    !Number.isSafeInteger(width_px) ||
    width_px <= 0 ||
    !Number.isSafeInteger(height_px) ||
    height_px <= 0 ||
    !Number.isSafeInteger(width_px * height_px)
  )
    throw new RangeError(
      "Flight raster dimensions must be positive safe integers",
    );
  const count = width_px * height_px;
  return {
    width_px,
    height_px,
    kinds: new Uint8Array(count),
    position_re: new Float64Array(count).fill(NaN),
    position_im: new Float64Array(count).fill(NaN),
  };
}

/** Trace all pixel centers without per-pixel objects, DOM, tiles, colors or I/O.
 * Only the optional output buffer is mutated. Every miss overwrites old coordinates.
 */
export function trace_flight_frame(projection, output = null) {
  const { width_px, height_px, forward, right, up, origin, pixel_step } =
    projection;
  const frame = output ?? create_flight_intersections(width_px, height_px);
  const count = width_px * height_px;
  // Most rays need no length calculation; check world-distance overflow only
  // when even the longest viewport ray could exceed the finite number range.
  const safe_scale =
    Number.MAX_VALUE /
    Math.hypot(1, (width_px * pixel_step) / 2, (height_px * pixel_step) / 2);
  if (
    frame.width_px !== width_px ||
    frame.height_px !== height_px ||
    !(frame.kinds instanceof Uint8Array) ||
    frame.kinds.length !== count ||
    !(frame.position_re instanceof Float64Array) ||
    frame.position_re.length !== count ||
    !(frame.position_im instanceof Float64Array) ||
    frame.position_im.length !== count
  )
    throw new RangeError(
      "Flight intersection buffer does not match the raster",
    );
  for (let y = 0; y < height_px; y++) {
    const vertical = (height_px / 2 - y - 0.5) * pixel_step;
    const row_re = forward.re + vertical * up.re;
    const row_im = forward.im + vertical * up.im;
    const row_up = forward.up + vertical * up.up;
    for (let x = 0; x < width_px; x++) {
      const index = y * width_px + x;
      const horizontal = (x + 0.5 - width_px / 2) * pixel_step;
      const re = row_re + horizontal * right.re;
      const im = row_im + horizontal * right.im;
      let kind = ray_kind(re, im, row_up);
      let hit_re = NaN,
        hit_im = NaN;
      if (kind === FLIGHT_RAY_PLANE) {
        const scale = -origin.up / row_up;
        hit_re = origin.re + scale * re;
        hit_im = origin.im + scale * im;
        if (
          !Number.isFinite(scale) ||
          !Number.isFinite(hit_re) ||
          !Number.isFinite(hit_im) ||
          (scale > safe_scale &&
            !Number.isFinite(scale * Math.hypot(re, im, row_up)))
        ) {
          kind = FLIGHT_RAY_UNREPRESENTABLE;
          hit_re = NaN;
          hit_im = NaN;
        }
      }
      frame.kinds[index] = kind;
      frame.position_re[index] = hit_re;
      frame.position_im[index] = hit_im;
    }
  }
  return frame;
}
