/** The SDK's per-component instance limit (placed objects plus scatter counts). */
export const COMPONENT_INSTANCE_LIMIT = 1000;

const rectangle_area = ([x0, z0, x1, z1]) =>
  Math.max(0, x1 - x0) * Math.max(0, z1 - z0);
const overlap = (a, b) => [
  Math.max(a[0], b[0]),
  Math.max(a[1], b[1]),
  Math.min(a[2], b[2]),
  Math.min(a[3], b[3]),
];
/** Scatter area in m²: the rule's bounds minus its exclusions (clipped to the bounds; overlapping exclusions are counted once each). */
export const scatter_area = (scatter) =>
  Math.max(
    0,
    rectangle_area(scatter.bounds) -
      scatter.exclusions.reduce(
        (sum, exclusion) =>
          sum + rectangle_area(overlap(scatter.bounds, exclusion)),
        0,
      ),
  );

/**
 * How each material is used in a component document: placed objects (and how
 * many move), scattered instances (rules, area, density), scale range and the
 * floor. Rows are sorted by total instances, then ID.
 */
export function component_material_usage(document) {
  const rows = new Map();
  const row = (asset) => {
    if (!rows.has(asset.id))
      rows.set(asset.id, {
        id: asset.id,
        revisions: new Set(),
        placed: 0,
        moving: 0,
        scattered: 0,
        scatter_rules: 0,
        scatter_area: 0,
        scale_min: Infinity,
        scale_max: -Infinity,
        floor: null,
      });
    const entry = rows.get(asset.id);
    entry.revisions.add(asset.revision);
    return entry;
  };
  const scales = (entry, low, high) => {
    entry.scale_min = Math.min(entry.scale_min, low);
    entry.scale_max = Math.max(entry.scale_max, high);
  };
  for (const object of document.objects) {
    const entry = row(object.asset);
    entry.placed += 1;
    if (object.motion) entry.moving += 1;
    scales(entry, Math.min(...object.scale), Math.max(...object.scale));
  }
  for (const scatter of document.scatters) {
    const entry = row(scatter.asset);
    entry.scattered += scatter.count;
    entry.scatter_rules += 1;
    entry.scatter_area += scatter_area(scatter);
    if (scatter.count > 0) scales(entry, scatter.scale[0], scatter.scale[1]);
  }
  if (document.floor?.asset) {
    const entry = row(document.floor.asset);
    const [width, depth] = document.floor.size;
    const [u, v] = document.floor.texture_repeat;
    entry.floor = { width, depth, area: width * depth, repeat: [u, v] };
  }
  const floor_area = document.floor
    ? document.floor.size[0] * document.floor.size[1]
    : null;
  const materials = [...rows.values()]
    .map((entry) => ({
      ...entry,
      revisions: [...entry.revisions].sort(),
      instances: entry.placed + entry.scattered,
      density:
        entry.scatter_area > 0 ? entry.scattered / entry.scatter_area : null,
      per_floor_m2:
        floor_area && entry.placed + entry.scattered
          ? (entry.placed + entry.scattered) / floor_area
          : null,
      scale_min: Number.isFinite(entry.scale_min) ? entry.scale_min : null,
      scale_max: Number.isFinite(entry.scale_max) ? entry.scale_max : null,
    }))
    .sort((a, b) => b.instances - a.instances || a.id.localeCompare(b.id));
  return {
    materials,
    instances: materials.reduce((sum, entry) => sum + entry.instances, 0),
    limit: COMPONENT_INSTANCE_LIMIT,
    floor_area,
    scatter_rules: document.scatters.length,
  };
}

/** A material's family: its catalog folder when known, else its ID without a trailing number. */
export const material_family = (id, catalog = {}) =>
  catalog[id]?.folder_path || id.replace(/-\d+$/, "");

/**
 * Collapses materials of one family (catalog folder, or shared ID prefix) into
 * a summed group when at least `minimum` of them are used, e.g. 84 individual
 * rock pieces. Other materials stay single rows; order follows the totals.
 */
export function group_material_usage(materials, catalog = {}, minimum = 5) {
  const families = new Map();
  for (const entry of materials) {
    const family = material_family(entry.id, catalog);
    if (!families.has(family)) families.set(family, []);
    families.get(family).push(entry);
  }
  const sum = (members, key) =>
    members.reduce((total, member) => total + (member[key] ?? 0), 0);
  const extreme = (members, pick, key) => {
    const values = members
      .map((member) => member[key])
      .filter((value) => value !== null);
    return values.length ? pick(...values) : null;
  };
  const rows = [];
  for (const [family, members] of families) {
    if (members.length < minimum) {
      rows.push(...members.map((member) => ({ kind: "material", ...member })));
      continue;
    }
    const scatter_area = sum(members, "scatter_area");
    const scattered = sum(members, "scattered");
    rows.push({
      kind: "group",
      id: family,
      members,
      placed: sum(members, "placed"),
      moving: sum(members, "moving"),
      scattered,
      scatter_rules: sum(members, "scatter_rules"),
      scatter_area,
      density: scatter_area > 0 ? scattered / scatter_area : null,
      per_floor_m2: members.some((member) => member.per_floor_m2 !== null)
        ? sum(members, "per_floor_m2")
        : null,
      instances: sum(members, "instances"),
      scale_min: extreme(members, Math.min, "scale_min"),
      scale_max: extreme(members, Math.max, "scale_max"),
      floor: null,
    });
  }
  return rows.sort(
    (a, b) => b.instances - a.instances || a.id.localeCompare(b.id),
  );
}
