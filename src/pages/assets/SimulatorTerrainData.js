export const TERRAIN_HEIGHT_SCOPE_RATIO = 1 / 15;
const ITERATION_REFERENCE = 1_000_000;
export const TERRAIN_PREVIEW_SIZE = 129;
export const TERRAIN_MAX_SIZE = 2000;
export const TERRAIN_RESOLUTIONS = [129, 250, 500, 1000, 1500, 2000];
export function terrain_resolution(value) {
  return TERRAIN_RESOLUTIONS.includes(value) ? value : 500;
}

/** Provisional shared mapping for interior convergence and exterior escape counts. */
export function terrain_height(iteration, scope) {
  if (!Number.isFinite(scope) || scope <= 0) throw new RangeError("Terrain scope must be positive and finite");
  if (!Number.isFinite(iteration) || iteration < 0) return null;
  return scope * TERRAIN_HEIGHT_SCOPE_RATIO * Math.min(1, Math.log1p(iteration) / Math.log1p(ITERATION_REFERENCE));
}

/** Column-major Fracto buffer to a local, Y-up grid; imaginary +y maps to -Z. */
export function terrain_mesh_data(buffer, scope) {
  const width = buffer?.length;
  const height = buffer?.[0]?.length;
  if (!Number.isFinite(scope) || scope <= 0 || width < 2 || height < 2 ||
    width > TERRAIN_MAX_SIZE || height > TERRAIN_MAX_SIZE ||
    !Array.isArray(buffer) || !buffer.every((column) => Array.isArray(column) && column.length === height)) {
    throw new Error("Invalid terrain buffer or scope");
  }
  const positions = new Float32Array(width * height * 3);
  const uvs = new Float32Array(width * height * 2);
  const valid = new Uint8Array(width * height);
  const indices = new Uint32Array((width - 1) * (height - 1) * 6);
  let index_count = 0;
  let max_height = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const sample = buffer[x][y];
      const elevation = Array.isArray(sample) && Number.isFinite(sample[0]) && sample[0] !== -1
        ? terrain_height(sample[1], scope) : null;
      valid[index] = elevation !== null ? 1 : 0;
      max_height = Math.max(max_height, elevation ?? 0);
      positions.set([(x - width / 2) * scope / width, elevation ?? 0,
        (y - height / 2) * scope / width], index * 3);
      uvs.set([(x + 0.5) / width, 1 - (y + 0.5) / height], index * 2);
      if (x && y) {
        const a = index - width - 1, b = index - width, c = index - 1;
        if (valid[a] && valid[c] && valid[b]) {
          indices[index_count++] = a; indices[index_count++] = c; indices[index_count++] = b;
        }
        if (valid[b] && valid[c] && valid[index]) {
          indices[index_count++] = b; indices[index_count++] = c; indices[index_count++] = index;
        }
      }
    }
  }
  if (!index_count) throw new Error("Terrain buffer has no valid surface");
  return { positions, valid, uvs, indices: indices.subarray(0, index_count), max_height, width, height };
}
