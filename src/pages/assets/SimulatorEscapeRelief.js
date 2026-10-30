const EDGE = 257,
  SOURCE = 256,
  // A wider Gaussian rounds the larger escape/pattern steps introduced by scaling.
  KERNEL = [1, 3, 7, 11, 13, 11, 7, 3, 1],
  RADIUS = 4;

export const ESCAPE_RELIEF_MULTIPLIER = 100;

/** Rebuild only heights from original samples: escape multiplier, log, cap, Gaussian smoothing. */
export function scale_escape_relief(mesh, scale) {
  if (scale === 1) return mesh;
  const count = EDGE * EDGE,
    heights = new Float64Array(count),
    valid = new Uint8Array(count);
  for (let y = 0; y < EDGE; y++)
    for (let x = 0; x < EDGE; x++) {
      const source = Math.min(y, 255) * SOURCE + Math.min(x, 255),
        index = y * EDGE + x;
      const pattern = mesh.patterns[source],
        iterations = mesh.iterations[source];
      if (
        pattern === -2147483648 ||
        pattern === -1 ||
        !Number.isFinite(iterations) ||
        iterations < 0
      )
        continue;
      valid[index] = 1;
      heights[index] = Math.min(
        1,
        Math.log1p(iterations * (pattern === 0 ? scale : 1)) /
          Math.log1p(1000000),
      );
    }
  const sums = new Float64Array(count),
    weights = new Float64Array(count);
  for (let y = 0; y < EDGE; y++)
    for (let x = 0; x < EDGE; x++) {
      const index = y * EDGE + x;
      for (let dx = -RADIUS; dx <= RADIUS; dx++) {
        if (x + dx < 0 || x + dx >= EDGE || !valid[index + dx]) continue;
        sums[index] += heights[index + dx] * KERNEL[dx + RADIUS];
        weights[index] += KERNEL[dx + RADIUS];
      }
    }
  const positions = mesh.positions.slice();
  let maximum_height = 0;
  for (let y = 0; y < EDGE; y++)
    for (let x = 0; x < EDGE; x++) {
      const index = y * EDGE + x;
      let sum = 0,
        weight = 0;
      if (valid[index])
        for (let dy = -RADIUS; dy <= RADIUS; dy++) {
          if (y + dy < 0 || y + dy >= EDGE) continue;
          const neighbor = (y + dy) * EDGE + x;
          sum += sums[neighbor] * KERNEL[dy + RADIUS];
          weight += weights[neighbor] * KERNEL[dy + RADIUS];
        }
      const height = weight ? sum / weight : 0;
      positions[index * 3 + 1] = height;
      maximum_height = Math.max(maximum_height, height);
    }
  return { ...mesh, positions, metadata: { ...mesh.metadata, maximum_height } };
}
