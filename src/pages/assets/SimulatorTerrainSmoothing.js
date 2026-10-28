export const DEFAULT_TERRAIN_SMOOTHING = 100;
const KERNEL = [1, 4, 6, 4, 1];

export function terrain_smoothing(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : DEFAULT_TERRAIN_SMOOTHING;
}

/** Radius-two separable Gaussian, normalized by valid coverage (including at edges). */
export function smooth_terrain_positions(base_positions, valid, width, height, strength, on_progress) {
  on_progress?.(0);
  const blend = terrain_smoothing(strength) / 100;
  const positions = new Float32Array(base_positions);
  let max_height = 0;
  if (blend > 0) {
    const values = new Float64Array(width * height);
    const weights = new Float64Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        for (let dx = -2; dx <= 2; dx++) {
          if (x + dx < 0 || x + dx >= width) continue;
          const neighbor = index + dx;
          if (!valid[neighbor]) continue;
          const weight = KERNEL[dx + 2];
          values[index] += base_positions[neighbor * 3 + 1] * weight;
          weights[index] += weight;
        }
      }
      on_progress?.(0.45 * (y + 1) / height);
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        if (!valid[index]) continue;
        let sum = 0, weight_sum = 0;
        for (let dy = -2; dy <= 2; dy++) {
          if (y + dy < 0 || y + dy >= height) continue;
          const neighbor = (y + dy) * width + x;
          const weight = KERNEL[dy + 2];
          sum += values[neighbor] * weight;
          weight_sum += weights[neighbor] * weight;
        }
        const original = base_positions[index * 3 + 1];
        positions[index * 3 + 1] = original + blend * (sum / weight_sum - original);
      }
      on_progress?.(0.45 + 0.45 * (y + 1) / height);
    }
  }
  for (let i = 0; i < valid.length; i++) {
    if (valid[i]) max_height = Math.max(max_height, positions[i * 3 + 1]);
    if ((i + 1) % width === 0) on_progress?.(0.9 + 0.1 * (i + 1) / valid.length);
  }
  on_progress?.(1);
  return { positions, max_height };
}
