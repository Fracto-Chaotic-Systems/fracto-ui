import {
  TERRAIN_VERTEX_EDGE as EDGE,
  weld_equal_level_edges,
} from "./SimulatorTerrainEdges.js";

const LAST = EDGE - 1;
const tile_key = (level, column, row) => `${level}/${column}/${row}`;
const corner_key = (patch, x, y) =>
  tile_key(patch.level, patch.column + x, patch.row + y);
// Physical side order: north, east, south, west. Texture offsets retain native orientation.
function native_offset(patch, side, index) {
  const native_side = patch.mirror_y && side % 2 === 0 ? 2 - side : side;
  const along = patch.mirror_y && side % 2 ? LAST - index : index;
  return native_side * EDGE + along;
}
function segment_exists(patch, side, index) {
  const a = native_offset(patch, side, index),
    b = native_offset(patch, side, index + 1);
  const native_side = Math.floor(a / EDGE),
    along = Math.min(a % EDGE, b % EDGE);
  return Boolean(patch.boundary.segments?.[native_side * LAST + along]);
}
function sample(patch, side, index) {
  const low = Math.floor(index),
    high = Math.ceil(index);
  const a = native_offset(patch, side, low),
    b = native_offset(patch, side, high);
  if (
    !patch.boundary.valid[a] ||
    !patch.boundary.valid[b] ||
    (low !== high && !segment_exists(patch, side, low))
  )
    return null;
  return (
    patch.heights[a] + (patch.heights[b] - patch.heights[a]) * (index - low)
  );
}
function set_corner(patch, x, y, height) {
  patch.heights[native_offset(patch, y ? 2 : 0, x * LAST)] = height;
  patch.heights[native_offset(patch, x ? 1 : 3, y * LAST)] = height;
}

/** Snap 2:1 fine borders to coarse vertices, collapsing odd edge vertices to remove T-junctions. */
export function weld_terrain_edges(placements) {
  const patches = weld_equal_level_edges(placements);
  const lookup = new Map(
    patches.map((patch) => [
      tile_key(patch.level, patch.column, patch.row),
      patch,
    ]),
  );
  const levels = [...new Set(patches.map((patch) => patch.level))].sort(
    (a, b) => a - b,
  );
  for (const level of levels) {
    const constraints = new Map();
    const fine = patches.filter((patch) => patch.level === level);
    for (const patch of fine) {
      const c = patch.column,
        r = patch.row;
      const neighbors = [
        r % 2 === 0 ? [Math.floor(c / 2), Math.floor((r - 1) / 2)] : null,
        c % 2 ? [Math.floor((c + 1) / 2), Math.floor(r / 2)] : null,
        r % 2 ? [Math.floor(c / 2), Math.floor((r + 1) / 2)] : null,
        c % 2 === 0 ? [Math.floor((c - 1) / 2), Math.floor(r / 2)] : null,
      ];
      for (let side = 0; side < 4; side++) {
        const location = neighbors[side];
        const coarse = location && lookup.get(tile_key(level - 1, ...location));
        if (!coarse) continue;
        const opposite = (side + 2) % 4;
        const start = ((side % 2 ? r % 2 : c % 2) * LAST) / 2;
        for (let i = 0; i <= LAST; i++) {
          const offset = native_offset(patch, side, i);
          if (!patch.boundary.valid[offset]) continue;
          let anchor = i;
          // Keep genuine missing-data edges untouched rather than bridging holes.
          if (
            i % 2 &&
            segment_exists(patch, side, i - 1) &&
            segment_exists(patch, side, i) &&
            sample(coarse, opposite, start + i / 2) !== null
          )
            anchor = i - 1;
          const height = sample(coarse, opposite, start + anchor / 2);
          if (height === null) continue;
          patch.heights[offset] = height;
          if (anchor !== i) {
            if (!patch.coordinates)
              patch.coordinates = Float32Array.from(
                { length: 4 * EDGE },
                (_, j) => (j % EDGE) / LAST,
              );
            patch.coordinates[offset] =
              patch.mirror_y && side % 2 ? 1 - anchor / LAST : anchor / LAST;
          }
          if (i === 0 || i === LAST) {
            const x = side % 2 ? (side === 1 ? 1 : 0) : i / LAST;
            const y = side % 2 ? i / LAST : side === 2 ? 1 : 0;
            constraints.set(corner_key(patch, x, y), height);
          }
        }
      }
    }
    // A snapped corner also belongs to perpendicular fine edges and other fine tiles.
    for (const patch of fine)
      for (const x of [0, 1])
        for (const y of [0, 1]) {
          const key = corner_key(patch, x, y);
          if (
            constraints.has(key) &&
            patch.boundary.valid[native_offset(patch, y ? 2 : 0, x * LAST)]
          )
            set_corner(patch, x, y, constraints.get(key));
        }
  }
  for (const patch of patches)
    patch.changed =
      patch.heights.some((height, i) => height !== patch.boundary.heights[i]) ||
      Boolean(
        patch.coordinates?.some((value, i) => value !== (i % EDGE) / LAST),
      );
  return patches;
}
