import {
  TILE_EDGE,
  MIN_FLIGHT_TILE_LEVEL,
  MAX_FLIGHT_TILE_LEVEL,
  tile_code_for_point,
  tile_bounds,
} from "@fracto/sdk/FractoTileGeometry.js";
import { FLIGHT_RAY_PLANE } from "./FlightProjection.js";

export function create_flight_sample_buffer(width_px, height_px) {
  if (
    !Number.isSafeInteger(width_px) ||
    width_px <= 0 ||
    !Number.isSafeInteger(height_px) ||
    height_px <= 0 ||
    !Number.isSafeInteger(width_px * height_px)
  )
    throw new RangeError("Invalid flight sample dimensions");
  const count = width_px * height_px;
  return {
    width_px,
    height_px,
    values: new Float64Array(count * 2),
    levels: new Uint8Array(count),
    tile_indices: new Int32Array(count),
    sample_indices: new Int32Array(count),
    tile_codes: [],
  };
}

/** Nonblocking adaptive numerical sampler. Call sample per view/frame; await
 * settled only when a caller wants to wait for the current asynchronous pass.
 * Tile cache ownership stays with the caller. No colors, terrain, DOM or timers.
 */
export function create_flight_refinement(
  cache,
  {
    max_level = MAX_FLIGHT_TILE_LEVEL,
    max_catalog = 4096,
    max_requests_per_pass = 64,
    retry_delay_ms = 1000,
    now = Date.now,
  } = {},
) {
  for (const method of ["peek", "load", "availability", "pin", "get_stats"])
    if (typeof cache?.[method] !== "function")
      throw new TypeError(`Missing tile cache method: ${method}`);
  if (
    !Number.isInteger(max_level) ||
    max_level < MIN_FLIGHT_TILE_LEVEL ||
    max_level > MAX_FLIGHT_TILE_LEVEL
  )
    throw new RangeError("Invalid refinement depth");
  for (const limit of [max_catalog, max_requests_per_pass, retry_delay_ms])
    if (!Number.isSafeInteger(limit) || limit <= 0)
      throw new RangeError("Invalid refinement budget");
  const catalog = new Map(),
    pending = new Map();
  const seen_pool = [];
  let source_id = cache.get_stats().source_id,
    destroyed = false,
    last_error = null;
  const cancel = (job) => {
    job.controller.abort();
    job.group.remaining.delete(job.code);
    if (!job.group.remaining.size) job.group.controller.abort();
    if (pending.get(job.code) === job) pending.delete(job.code);
  };
  const reset = () => {
    for (const job of pending.values()) cancel(job);
    catalog.clear();
    seen_pool.length = 0;
    cache.pin([]);
    last_error = null;
    source_id = cache.get_stats().source_id;
  };
  const schedule = (candidates) => {
    const nodes = [...candidates]
      .map((code) => catalog.get(code))
      .filter(
        (node) => node && !pending.has(node.code) && node.retry_after <= now(),
      )
      .slice(0, Math.max(0, max_requests_per_pass - pending.size));
    for (let offset = 0; offset < nodes.length; offset += 256) {
      const batch = nodes.slice(offset, offset + 256);
      const group = {
        controller: new AbortController(),
        remaining: new Set(batch.map((node) => node.code)),
      };
      const availability = cache.availability(
        batch.map((node) => node.code),
        { signal: group.controller.signal },
      );
      for (const node of batch) {
        const job = {
          code: node.code,
          controller: new AbortController(),
          group,
          promise: null,
        };
        pending.set(node.code, job);
        job.promise = (async () => {
          try {
            const known = await availability;
            if (job.controller.signal.aborted) return;
            const tile = known[node.code]
              ? await cache.load(node.code, { signal: job.controller.signal })
              : null;
            if (
              job.controller.signal.aborted ||
              catalog.get(node.code) !== node
            )
              return;
            node.retry_after = tile ? 0 : now() + retry_delay_ms;
            node.error = null;
          } catch (error) {
            if (
              !job.controller.signal.aborted &&
              catalog.get(node.code) === node &&
              error.name !== "AbortError"
            ) {
              node.retry_after = now() + retry_delay_ms;
              node.error = error.code ?? error.message;
              last_error = { short_code: node.code, code: node.error };
            }
          } finally {
            group.remaining.delete(node.code);
            if (pending.get(node.code) === job) pending.delete(node.code);
          }
        })();
      }
    }
  };
  return {
    sample(intersections, output = null) {
      if (destroyed) throw new Error("Flight refinement destroyed");
      const current_source = cache.get_stats().source_id;
      if (source_id === null) source_id = current_source;
      else if (current_source !== source_id) reset();
      const { width_px, height_px, kinds, position_re, position_im } =
        intersections;
      const count = width_px * height_px;
      if (
        !Number.isSafeInteger(width_px) ||
        width_px <= 0 ||
        !Number.isSafeInteger(height_px) ||
        height_px <= 0 ||
        !Number.isSafeInteger(count) ||
        !(kinds instanceof Uint8Array) ||
        kinds.length !== count ||
        !(position_re instanceof Float64Array) ||
        position_re.length !== count ||
        !(position_im instanceof Float64Array) ||
        position_im.length !== count
      )
        throw new RangeError("Invalid flight intersections");
      const frame = output ?? create_flight_sample_buffer(width_px, height_px);
      if (
        frame.width_px !== width_px ||
        frame.height_px !== height_px ||
        !(frame.values instanceof Float64Array) ||
        frame.values.length !== count * 2 ||
        !(frame.levels instanceof Uint8Array) ||
        frame.levels.length !== count ||
        !(frame.tile_indices instanceof Int32Array) ||
        frame.tile_indices.length !== count ||
        !(frame.sample_indices instanceof Int32Array) ||
        frame.sample_indices.length !== count
      )
        throw new RangeError(
          "Flight sample buffer does not match intersections",
        );
      frame.values.fill(NaN);
      frame.levels.fill(0);
      frame.tile_indices.fill(-1);
      frame.sample_indices.fill(-1);
      frame.tile_codes = [];
      const needed = new Set(),
        candidates = new Set(),
        roots = new Map(),
        used_sample_tables = [],
        child_demands = new Set(),
        pinned = new Set();
      let catalog_limited = false,
        unresolved = 0,
        duplicate_count = 0,
        at_max_depth = 0;
      const ensure = (code) => {
        let node = catalog.get(code);
        if (!node) {
          if (catalog.size >= max_catalog) {
            const victim = [...catalog.keys()].find((key) => !needed.has(key));
            if (victim === undefined) {
              catalog_limited = true;
              return null;
            }
            if (pending.has(victim)) cancel(pending.get(victim));
            catalog.delete(victim);
          }
          node = {
            code,
            bounds: tile_bounds(code),
            retry_after: 0,
            error: null,
          };
        }
        if (!needed.has(code)) {
          catalog.delete(code);
          catalog.set(code, node);
          needed.add(code);
        }
        return node;
      };
      // Frame-local contexts cache tile references and child links once per region.
      // The persistent catalog never holds decoded arrays outside the tile budget.
      const context = (node) =>
        node && {
          node,
          tile: cache.peek(node.code),
          children: [],
          id: -1,
          demanded: 0,
          increment: (node.bounds.right - node.bounds.left) / TILE_EDGE,
          mid_re: (node.bounds.left + node.bounds.right) / 2,
          mid_im: (node.bounds.top + node.bounds.bottom) / 2,
        };
      const demand = (entry, re, im) => {
        const digit =
          (re >= entry.mid_re ? 1 : 0) + (Math.abs(im) <= entry.mid_im ? 2 : 0);
        if (!(entry.demanded & (1 << digit))) {
          entry.demanded |= 1 << digit;
          child_demands.add(entry.node.code + digit);
        }
      };
      let last_root = null,
        last_context = null;
      for (let pixel = 0; pixel < count; pixel++) {
        if (kinds[pixel] !== FLIGHT_RAY_PLANE) continue;
        const re = position_re[pixel],
          im = position_im[pixel];
        const root = tile_code_for_point(re, im);
        if (root === null) {
          unresolved++;
          continue;
        }
        if (root !== last_root) {
          if (!roots.has(root)) roots.set(root, context(ensure(root)));
          last_root = root;
          last_context = roots.get(root);
        }
        let entry = last_context,
          missing = null,
          chosen = null,
          sample_index = -1;
        while (entry) {
          const { node, tile, increment } = entry;
          if (tile) {
            const i = Math.max(
              0,
              Math.min(255, Math.round((re - node.bounds.left) / increment)),
            );
            const j = Math.max(
              0,
              Math.min(
                255,
                Math.round((node.bounds.top - Math.abs(im)) / increment),
              ),
            );
            const index = j * TILE_EDGE + i;
            if (
              Number.isFinite(tile.values[index * 2]) &&
              Number.isFinite(tile.values[index * 2 + 1])
            ) {
              chosen = entry;
              sample_index = index;
              missing = null;
            }
          } else if (missing === null) missing = node;
          if (node.code.length === max_level) break;
          const digit =
            (re >= entry.mid_re ? 1 : 0) +
            (Math.abs(im) <= entry.mid_im ? 2 : 0);
          if (entry.children[digit] === undefined) {
            const next = node.code + digit;
            entry.children[digit] = catalog.has(next)
              ? context(ensure(next))
              : null;
          }
          entry = entry.children[digit];
        }
        if (missing) candidates.add(missing.code);
        if (!chosen) {
          unresolved++;
          continue;
        }
        if (chosen.id === -1) {
          chosen.id = frame.tile_codes.length;
          pinned.add(chosen.node.code);
          frame.tile_codes.push(chosen.node.code);
          chosen.first_samples = (
            seen_pool.pop() ?? new Int32Array(TILE_EDGE * TILE_EDGE)
          ).fill(-1);
          used_sample_tables.push(chosen.first_samples);
        }
        const { tile, id } = chosen;
        frame.values[pixel * 2] = tile.values[sample_index * 2];
        frame.values[pixel * 2 + 1] = tile.values[sample_index * 2 + 1];
        frame.levels[pixel] = chosen.node.code.length;
        frame.tile_indices[pixel] = id;
        frame.sample_indices[pixel] = sample_index;
        const first = chosen.first_samples[sample_index];
        if (first === -1) chosen.first_samples[sample_index] = pixel;
        else {
          duplicate_count += first >= 0 ? 2 : 1;
          if (chosen.node.code.length === max_level)
            at_max_depth += first >= 0 ? 2 : 1;
          else {
            if (first >= 0)
              demand(chosen, position_re[first], position_im[first]);
            demand(chosen, re, im);
          }
          if (first >= 0) chosen.first_samples[sample_index] = -2;
        }
      }
      // Only pixels sharing the exact tile/sample identity justify new children.
      for (const child of child_demands) {
        const node = ensure(child);
        if (node && !cache.peek(child)) candidates.add(child);
      }
      for (const job of pending.values())
        if (!needed.has(job.code)) cancel(job);
      cache.pin([...pinned]);
      schedule(candidates);
      frame.unresolved_count = unresolved;
      frame.duplicate_count = duplicate_count;
      frame.max_depth_duplicate_count = at_max_depth;
      frame.catalog_limited = catalog_limited;
      for (const table of used_sample_tables)
        if (seen_pool.length < 64) seen_pool.push(table);
      return frame;
    },
    async settled() {
      await Promise.all([...pending.values()].map((job) => job.promise));
    },
    reset,
    destroy() {
      if (!destroyed) {
        destroyed = true;
        reset();
      }
    },
    get_stats() {
      return {
        source_id,
        catalog: catalog.size,
        pending: pending.size,
        last_error,
        destroyed,
      };
    },
  };
}
