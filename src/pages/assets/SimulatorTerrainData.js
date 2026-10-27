export const TERRAIN_MAX_HEIGHT = 0.25;
const ITERATION_REFERENCE = 1_000_000;

/** Provisional shared mapping for interior convergence and exterior escape counts. */
export function terrain_height(iteration) {
  if (!Number.isFinite(iteration) || iteration < 0) return null;
  return TERRAIN_MAX_HEIGHT * Math.min(1, Math.log1p(iteration) / Math.log1p(ITERATION_REFERENCE));
}

/** Column-major Fracto buffer to a local, Y-up grid; imaginary +y maps to -Z. */
export function terrain_mesh_data(buffer, scope) {
  const width = buffer?.length;
  const height = buffer?.[0]?.length;
  if (!Number.isFinite(scope) || scope <= 0 || width < 2 || height < 2 ||
    !Array.isArray(buffer) || !buffer.every((column) => Array.isArray(column) && column.length === height)) {
    throw new Error("Invalid terrain buffer or scope");
  }
  const positions = new Float32Array(width * height * 3);
  const uvs = new Float32Array(width * height * 2);
  const valid = new Uint8Array(width * height);
  const indices = [];
  let max_height = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const sample = buffer[x][y];
      const elevation = Array.isArray(sample) && Number.isFinite(sample[0]) && sample[0] !== -1
        ? terrain_height(sample[1]) : null;
      valid[index] = elevation !== null ? 1 : 0;
      max_height = Math.max(max_height, elevation ?? 0);
      positions.set([(x - width / 2) * scope / width, elevation ?? 0,
        (y - height / 2) * scope / width], index * 3);
      uvs.set([(x + 0.5) / width, 1 - (y + 0.5) / height], index * 2);
      if (x && y) {
        const a = index - width - 1, b = index - width, c = index - 1;
        if (valid[a] && valid[c] && valid[b]) indices.push(a, c, b);
        if (valid[b] && valid[c] && valid[index]) indices.push(b, c, index);
      }
    }
  }
  if (!indices.length) throw new Error("Terrain buffer has no valid surface");
  return { positions, uvs, indices, max_height };
}
