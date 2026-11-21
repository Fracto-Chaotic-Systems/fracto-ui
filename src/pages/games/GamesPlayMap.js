export const PARCHMENT_MAP_VIEW = Object.freeze({
  width_px: 400,
  aspect_ratio: 0.9,
  focal_point: Object.freeze({ x: -0.75, y: 0 }),
  scope: 2.8,
});

// Tenth-unit subdivisions share the raster's bounds, with integer coordinates
// emphasized. Integer indices avoid accumulating floating-point step errors.
export function parchment_grid_lines(view = PARCHMENT_MAP_VIEW) {
  const { focal_point, scope, aspect_ratio } = view;
  const lines = [];
  for (const axis of ["re", "im"]) {
    const center = axis === "re" ? focal_point.x : focal_point.y;
    const span = axis === "re" ? scope : scope * aspect_ratio;
    for (
      let index = Math.ceil((center - span / 2) * 10);
      index <= Math.floor((center + span / 2) * 10);
      index++
    ) {
      const value = index / 10;
      lines.push({
        axis,
        value,
        major: index % 10 === 0,
        half: index % 5 === 0,
        position_pct: (0.5 + (axis === "re" ? 1 : -1) * (value - center) / span) * 100,
      });
    }
  }
  return lines;
}

export function flight_map_marker(state) {
  if (
    state?.source === "unavailable" ||
    ![state?.position_re, state?.position_im, state?.heading_deg].every(
      Number.isFinite,
    )
  ) {
    return null;
  }
  const { focal_point, scope, aspect_ratio } = PARCHMENT_MAP_VIEW;
  const x = 0.5 + (state.position_re - focal_point.x) / scope;
  const y = 0.5 - (state.position_im - focal_point.y) / (scope * aspect_ratio);
  // Keep the symbol visible at the edge when flying beyond the miniature chart.
  const bounded = (value) => Math.min(96, Math.max(4, value * 100));
  return {
    x_pct: bounded(x),
    y_pct: bounded(y),
    heading_deg: ((state.heading_deg % 360) + 360) % 360,
    off_map: x < 0 || x > 1 || y < 0 || y > 1,
  };
}

const BASE_ESCAPE_OUTLINE_MAX_GREY = 80;
const RIGHT_ESCAPE_OUTLINE_MAX_GREY = 112;
const SOFT_ESCAPE_OUTLINE_MAX_GREY = 128;
const FULL_BRANCH_BAND_WIDTH = 4;
const MAX_BRANCH_BAND_WIDTH = 6;
const BAND_DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];

function smooth_falloff(value, start, end) {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return 1 - t * t * (3 - 2 * t);
}

function antenna_outline_weight(real, imaginary) {
  // Strengthen the far-left real-axis antenna with feathered ends and sides.
  return (1 - smooth_falloff(real, -2.06, -2)) *
    smooth_falloff(real, -1.4, -1.34) *
    smooth_falloff(Math.abs(imaginary), 0.025, 0.08);
}

function outline_region_weight(real, y, height) {
  if (real >= -0.5) return 1;
  const imaginary = PARCHMENT_MAP_VIEW.focal_point.y +
    (0.5 - y / height) * PARCHMENT_MAP_VIEW.scope * PARCHMENT_MAP_VIEW.aspect_ratio;
  return antenna_outline_weight(real, imaginary);
}

function narrow_branch_strength(mask, width, height, x, y, band_scale = 1) {
  // A filament has a short cross-section in at least one direction. Include
  // colored set pixels in the mask so broad shading beside a bulb cannot be
  // mistaken for a separate thin filament.
  let narrowest = Infinity;
  for (const [dx, dy] of BAND_DIRECTIONS) {
    let span = 1;
    for (const sign of [-1, 1]) {
      for (let step = 1; span <= MAX_BRANCH_BAND_WIDTH; step++) {
        const nx = x + dx * step * sign;
        const ny = y + dy * step * sign;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height || !mask[ny * width + nx]) break;
        span++;
      }
    }
    // Diagonal samples are farther apart, so measure all directions in pixels.
    narrowest = Math.min(narrowest, 1 + (span - 1) * Math.hypot(dx, dy));
  }
  return smooth_falloff(
    narrowest,
    FULL_BRANCH_BAND_WIDTH * band_scale,
    MAX_BRANCH_BAND_WIDTH * band_scale,
  );
}

// Keep set colors and the darkest escape shading around fine branches. Lighter
// escape pixels expose the grid. Buffers are column-major; both pattern signs
// belong to the set.
export function reveal_escape_grid(canvas_buffer, ctx, display_width) {
  const { width, height } = ctx.canvas;
  const image = ctx.getImageData(0, 0, width, height);
  const pixels_per_css = Number.isFinite(display_width) && display_width > 0
    ? width / display_width : 2;
  // Preserve the geometric width guard at small sizes. Only the narrow branch
  // coverage spreads, by less than one CSS pixel; broad bands cannot grow.
  const radius = Math.min(4, Math.max(0, 0.75 * (pixels_per_css - 2)));
  // Retain a minimum three-sample core at large sizes so raster quantization
  // cannot erase a fine branch when its display footprint grows.
  const band_scale = Math.min(1, Math.max(0.75, pixels_per_css / 2));
  const dark_mask = new Uint8Array(width * height);
  const branch_coverage = new Float32Array(width * height);
  const branch_shape = new Float32Array(width * height);
  const shade_at = (offset) => Math.max(
    image.data[offset], image.data[offset + 1], image.data[offset + 2],
  );
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const point = canvas_buffer[x]?.[y];
      const index = y * width + x;
      dark_mask[index] = point && (
        point[0] !== 0 || shade_at(index * 4) <= SOFT_ESCAPE_OUTLINE_MAX_GREY
      ) ? 1 : 0;
    }
  }
  for (let x = 0; x < width; x++) {
    const real = PARCHMENT_MAP_VIEW.focal_point.x +
      (x / width - 0.5) * PARCHMENT_MAP_VIEW.scope;
    for (let y = 0; y < height; y++) {
      const point = canvas_buffer[x]?.[y];
      const offset = (y * width + x) * 4;
      const shade = shade_at(offset);
      const region_weight = outline_region_weight(real, y, height);
      if (point?.[0] === 0 && region_weight > 0 && shade < SOFT_ESCAPE_OUTLINE_MAX_GREY) {
        const index = y * width + x;
        branch_shape[index] = narrow_branch_strength(dark_mask, width, height, x, y, band_scale);
        branch_coverage[index] = region_weight * branch_shape[index] *
          smooth_falloff(shade, RIGHT_ESCAPE_OUTLINE_MAX_GREY, SOFT_ESCAPE_OUTLINE_MAX_GREY);
      }
    }
  }
  const source = image.data.slice();
  const reach = Math.ceil(radius + 0.5);
  const kernel = [];
  if (radius > 0) {
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const weight = smooth_falloff(Math.hypot(dx, dy), Math.max(0, radius - 0.5), radius + 0.5);
        if (weight > 0) kernel.push({ dx, dy, weight });
      }
    }
  }
  for (let x = 0; x < width; x++) {
    const real = PARCHMENT_MAP_VIEW.focal_point.x + (x / width - 0.5) * PARCHMENT_MAP_VIEW.scope;
    for (let y = 0; y < height; y++) {
      const point = canvas_buffer[x]?.[y];
      const index = y * width + x;
      const offset = index * 4;
      if (point && point[0] !== 0) continue;
      if (!point) {
        image.data[offset + 3] = 0;
        continue;
      }
      if (shade_at(offset) <= BASE_ESCAPE_OUTLINE_MAX_GREY) continue;
      let alpha = source[offset + 3] * branch_coverage[index];
      let color_offset = offset;
      const region_weight = outline_region_weight(real, y, height);
      if (radius > 0 && region_weight > 0 && (!dark_mask[index] || branch_shape[index] > 0)) {
        for (const { dx, dy, weight } of kernel) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const neighbor = ny * width + nx;
          const candidate = source[neighbor * 4 + 3] * branch_coverage[neighbor] * weight * region_weight;
          if (candidate > alpha) {
            alpha = candidate;
            color_offset = neighbor * 4;
          }
        }
      }
      for (let channel = 0; channel < 3; channel++) {
        image.data[offset + channel] = source[color_offset + channel];
      }
      image.data[offset + 3] = Math.round(alpha);
    }
  }
  ctx.putImageData(image, 0, 0);
}

// Reapply from the unmasked source after resizing: alpha changes must never
// accumulate, and a CSS resize must not trigger a new fractal request.
export function create_parchment_map_painter() {
  let source = null;
  let display_width;
  const repaint = () => {
    if (!source) return;
    const { buffer, ctx, image } = source;
    ctx.putImageData(image, 0, 0);
    reveal_escape_grid(buffer, ctx, display_width);
  };
  return {
    resize(width) {
      display_width = width;
      repaint();
    },
    on_plan_complete(buffer, ctx) {
      source = { buffer, ctx, image: ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height) };
      repaint();
    },
  };
}
