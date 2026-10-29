export const TERRAIN_VERTEX_EDGE = 257;
const LAST = TERRAIN_VERTEX_EDGE - 1;

/** Original edge heights and triangle participation, shared by all placements of a cached file. */
export function terrain_boundary_data(positions, indices) {
  if (positions.length !== TERRAIN_VERTEX_EDGE ** 2 * 3) return null;
  const active = new Uint8Array(TERRAIN_VERTEX_EDGE ** 2);
  const flags = new Uint8Array(active.length),
    segments = new Uint8Array(4 * LAST);
  for (let i = 0; i <= LAST; i++) {
    flags[i] |= 1;
    flags[i * TERRAIN_VERTEX_EDGE + LAST] |= 2;
    flags[LAST * TERRAIN_VERTEX_EDGE + i] |= 4;
    flags[i * TERRAIN_VERTEX_EDGE] |= 8;
  }
  for (const index of indices) active[index] = 1;
  const connect = (a, b) => {
    const shared = flags[a] & flags[b],
      low = Math.min(a, b),
      difference = Math.abs(a - b);
    if (difference === 1) {
      if (shared & 1) segments[low] = 1;
      if (shared & 4) segments[2 * LAST + (low % TERRAIN_VERTEX_EDGE)] = 1;
    } else if (difference === TERRAIN_VERTEX_EDGE) {
      if (shared & 2)
        segments[LAST + Math.floor(low / TERRAIN_VERTEX_EDGE)] = 1;
      if (shared & 8)
        segments[3 * LAST + Math.floor(low / TERRAIN_VERTEX_EDGE)] = 1;
    }
  };
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i],
      b = indices[i + 1],
      c = indices[i + 2];
    if (!(flags[a] | flags[b] | flags[c])) continue;
    connect(a, b);
    connect(b, c);
    connect(c, a);
  }
  const heights = new Float32Array(4 * TERRAIN_VERTEX_EDGE),
    valid = new Uint8Array(heights.length);
  for (let i = 0; i <= LAST; i++) {
    const vertices = [
      i,
      i * TERRAIN_VERTEX_EDGE + LAST,
      LAST * TERRAIN_VERTEX_EDGE + i,
      i * TERRAIN_VERTEX_EDGE,
    ];
    for (let side = 0; side < 4; side++) {
      const offset = side * TERRAIN_VERTEX_EDGE + i;
      heights[offset] = positions[vertices[side] * 3 + 1];
      valid[offset] =
        active[vertices[side]] && Number.isFinite(heights[offset]) ? 1 : 0;
    }
  }
  return { heights, valid, segments };
}

function address(code, mirror) {
  let column = 0,
    row = 0;
  for (const digit of code) {
    const value = Number(digit);
    column = column * 2 + (value & 1);
    row = row * 2 + (value >> 1);
  }
  return {
    level: code.length,
    column,
    row: mirror ? 2 ** code.length - row - 1 : row,
  };
}
const tile_key = ({ level, column, row }) => `${level}/${column}/${row}`;
const offset = (side, index) => side * TERRAIN_VERTEX_EDGE + index;

/** Equal-level physical neighbors only. Integer quadtree addresses avoid coordinate tolerances. */
export function weld_equal_level_edges(placements) {
  const patches = placements.map((placement) => ({
    ...placement,
    ...address(placement.short_code, placement.mirror_y),
    heights: placement.boundary.heights.slice(),
    changed: false,
  }));
  const lookup = new Map(patches.map((patch) => [tile_key(patch), patch]));
  const write = (patch, index, height) => {
    patch.heights[index] = height;
  };
  const pair = (a, ai, b, bi) => {
    if (!a.boundary.valid[ai] || !b.boundary.valid[bi]) return;
    const height = (a.boundary.heights[ai] + b.boundary.heights[bi]) / 2;
    write(a, ai, height);
    write(b, bi, height);
  };
  const corners = new Map();
  for (const patch of patches) {
    const east = lookup.get(tile_key({ ...patch, column: patch.column + 1 }));
    const south = lookup.get(tile_key({ ...patch, row: patch.row + 1 }));
    for (let i = 1; i < LAST; i++) {
      if (east)
        pair(
          patch,
          offset(1, patch.mirror_y ? LAST - i : i),
          east,
          offset(3, east.mirror_y ? LAST - i : i),
        );
      if (south)
        pair(
          patch,
          offset(patch.mirror_y ? 0 : 2, i),
          south,
          offset(south.mirror_y ? 2 : 0, i),
        );
    }
    for (const x of [0, 1])
      for (const y of [0, 1]) {
        const local_y = (patch.mirror_y ? 1 - y : y) * LAST;
        const indices = [
          offset(local_y === 0 ? 0 : 2, x * LAST),
          offset(x === 0 ? 3 : 1, local_y),
        ];
        if (!patch.boundary.valid[indices[0]]) continue;
        const key = `${patch.level}/${patch.column + x}/${patch.row + y}`;
        if (!corners.has(key)) corners.set(key, []);
        corners
          .get(key)
          .push({ patch, indices, height: patch.boundary.heights[indices[0]] });
      }
  }
  for (const entries of corners.values()) {
    if (entries.length < 2) continue;
    const height =
      entries.reduce((sum, entry) => sum + entry.height, 0) / entries.length;
    for (const entry of entries)
      for (const index of entry.indices) write(entry.patch, index, height);
  }
  for (const patch of patches)
    patch.changed = patch.heights.some(
      (height, index) => height !== patch.boundary.heights[index],
    );
  return patches;
}
