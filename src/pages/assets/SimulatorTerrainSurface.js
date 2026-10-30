const EDGE = 257,
  LAST = 256;

/** Local vertical sampling of rendered triangles, including shader-welded edge coordinates. */
export default class SimulatorTerrainSurface {
  masks = new WeakMap();
  mask(geometry) {
    if (this.masks.has(geometry)) return this.masks.get(geometry);
    const indices = geometry.index?.array || [];
    const mask = new Uint8Array(LAST * LAST);
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i],
        b = indices[i + 1],
        c = indices[i + 2];
      const x = Math.min(a % EDGE, b % EDGE, c % EDGE),
        z = Math.min(
          Math.floor(a / EDGE),
          Math.floor(b / EDGE),
          Math.floor(c / EDGE),
        );
      if (x >= LAST || z >= LAST) continue;
      const nw = z * EDGE + x;
      mask[z * LAST + x] |= a === nw || b === nw || c === nw ? 1 : 2;
    }
    this.masks.set(geometry, mask);
    return mask;
  }
  vertex(mesh, index) {
    const positions = mesh.geometry.attributes.position.array;
    let x = positions[index * 3],
      y = positions[index * 3 + 1],
      z = positions[index * 3 + 2];
    const edges = mesh.userData.terrain_edges;
    if (edges) {
      // Same corner precedence and RG interpretation as the vertex shader.
      const offset =
        z === 0
          ? Math.round(x * LAST)
          : x === 1
            ? EDGE + Math.round(z * LAST)
            : z === 1
              ? 2 * EDGE + Math.round(x * LAST)
              : x === 0
                ? 3 * EDGE + Math.round(z * LAST)
                : -1;
      if (offset >= 0) {
        y = edges[offset * 2];
        if (z === 0 || z === 1) x = edges[offset * 2 + 1];
        else z = edges[offset * 2 + 1];
      }
    }
    return [x, y, z];
  }
  height_at(meshes, x, z) {
    for (const mesh of meshes) {
      if (mesh.geometry.attributes.position.count !== EDGE * EDGE) continue;
      const localX = (x - mesh.position.x) / mesh.scale.x,
        localZ = (z - mesh.position.z) / mesh.scale.z;
      if (
        localX < -1e-10 ||
        localX > 1 + 1e-10 ||
        localZ < -1e-10 ||
        localZ > 1 + 1e-10
      )
        continue;
      const col = Math.min(LAST - 1, Math.floor(Math.max(0, localX) * LAST));
      const row = Math.min(LAST - 1, Math.floor(Math.max(0, localZ) * LAST));
      const mask = this.mask(mesh.geometry);
      // Collapsed transition vertices can extend a triangle into a neighboring cell.
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) {
          const cx = col + dx,
            cz = row + dz;
          if (cx < 0 || cx >= LAST || cz < 0 || cz >= LAST) continue;
          const nw = cz * EDGE + cx,
            ne = nw + 1,
            sw = nw + EDGE,
            se = sw + 1,
            bits = mask[cz * LAST + cx];
          for (const [bit, indices] of [
            [1, [nw, sw, ne]],
            [2, [ne, sw, se]],
          ]) {
            if (!(bits & bit)) continue;
            const [a, b, c] = indices.map((index) => this.vertex(mesh, index));
            const denominator =
              (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
            if (Math.abs(denominator) < 1e-18) continue;
            const u =
              ((b[2] - c[2]) * (localX - c[0]) +
                (c[0] - b[0]) * (localZ - c[2])) /
              denominator;
            const v =
              ((c[2] - a[2]) * (localX - c[0]) +
                (a[0] - c[0]) * (localZ - c[2])) /
              denominator;
            if (u >= -1e-8 && v >= -1e-8 && u + v <= 1 + 1e-8)
              return (
                mesh.position.y +
                (u * a[1] + v * b[1] + (1 - u - v) * c[1]) * mesh.scale.y
              );
          }
        }
    }
    return null;
  }
}
