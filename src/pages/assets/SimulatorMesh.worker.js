import { decode_terrain_gzip } from "@fracto/sdk/terrain/Decode.js";
import { resolve_lod_plan } from "@fracto/sdk/terrain/Lod.js";
import SimulatorMeshTextures from "./SimulatorMeshTextures.js";
import { scale_escape_relief } from "./SimulatorEscapeRelief.js";

const cache = new Map();
const metadata = new Map();
const textures = new SimulatorMeshTextures();
let controller, active_id, last_view;

self.onmessage = async ({ data }) => {
  controller?.abort();
  if (data.cancel) {
    active_id = null;
    return;
  }
  const { id, plan, urls, geometry_keys, current_palette_key, texture_keys } =
    data;
  active_id = id;
  const scale = data.escape_scale || 1;
  const key_of = (plan, tile) =>
    `${plan.namespace}/${tile.short_code}/${tile.sha256}${scale === 1 ? "" : `/escape-${scale}`}`;
  const request = (controller = new AbortController());
  const emit = (message) => {
    if (active_id === id) self.postMessage({ id, ...message });
  };
  try {
    const base_palette_key = textures.key_for(plan);
    const selection_key = JSON.stringify([
      plan.region,
      plan.requested_refinements || [],
      plan.tiles.map((tile) => [key_of(plan, tile), tile.instances]),
    ]);
    if (
      last_view?.selection_key === selection_key &&
      current_palette_key === last_view.palette_key &&
      last_view.items.every(
        (item) =>
          geometry_keys.includes(item.key) &&
          (!texture_keys || texture_keys[item.key] === last_view.palette_key),
      )
    ) {
      emit({
        result: {
          ...last_view,
          escape_scale: scale,
          plan: resolve_lod_plan(plan, new Set(last_view.available_codes)),
          failures: [],
          detail_failures: [],
          cache_hits: last_view.items.length,
        },
      });
      return;
    }
    const entries = [],
      failures = [],
      available = new Set(geometry_keys);
    let next = 0,
      completed = 0,
      cache_hits = 0;
    const load_next = async () => {
      while (next < plan.tiles.length) {
        const tile = plan.tiles[next++],
          key = key_of(plan, tile);
        try {
          let mesh = cache.get(key);
          if (mesh) {
            cache_hits++;
            cache.delete(key);
          } else if (
            available.has(key) &&
            texture_keys?.[key] === base_palette_key &&
            textures.key === base_palette_key &&
            metadata.has(key)
          ) {
            cache_hits++;
            entries.push({ mesh: { metadata: metadata.get(key) }, tile, key });
            completed++;
            continue;
          } else {
            const response = await fetch(urls[tile.short_code], {
              credentials: "include",
              signal: AbortSignal.any([
                request.signal,
                AbortSignal.timeout(20000),
              ]),
            });
            if (!response.ok) throw new Error("Mesh unavailable");
            const compressed = await response.arrayBuffer();
            const digest = await crypto.subtle.digest("SHA-256", compressed);
            const sha256 = [...new Uint8Array(digest)]
              .map((byte) => byte.toString(16).padStart(2, "0"))
              .join("");
            if (sha256 !== tile.sha256) throw new Error("Mesh changed");
            mesh = scale_escape_relief(
              await decode_terrain_gzip(compressed),
              scale,
            );
            if (
              mesh.metadata.short_code !== tile.short_code ||
              mesh.metadata.namespace !== plan.namespace
            )
              throw new Error("Mesh identity changed");
          }
          if (request.signal.aborted) return;
          cache.set(key, mesh);
          metadata.delete(key);
          metadata.set(key, { maximum_height: mesh.metadata.maximum_height });
          while (metadata.size > 512)
            metadata.delete(metadata.keys().next().value);
          while (cache.size > 64) cache.delete(cache.keys().next().value);
          entries.push({ mesh, tile, key });
        } catch {
          if (request.signal.aborted) return;
          failures.push(tile.short_code);
        }
        completed++;
        emit({
          progress: {
            stage: "loading",
            value: Math.floor((completed / plan.tiles.length) * 70),
            completed,
            total: plan.tiles.length,
          },
        });
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(4, plan.tiles.length) }, load_next),
    );
    if (request.signal.aborted || active_id !== id) return;
    emit({ progress: { stage: "colors", value: 70 } });
    const resolved = resolve_lod_plan(
      plan,
      new Set(entries.map((entry) => entry.tile.short_code)),
    );
    const base_codes = new Set(
      resolved.base_tiles.map((tile) => tile.short_code),
    );
    const refined = new Set(resolved.refined_groups);
    const gap_failures = failures.filter((code) =>
      resolved.base_tiles.some(
        (tile) =>
          tile.short_code === code &&
          tile.instances.some(
            (instance) => !refined.has(`${code}/${instance.mirror_y ? 1 : 0}`),
          ),
      ),
    );
    const detail_failures = failures.filter((code) => !base_codes.has(code));
    const active = new Set(resolved.tiles.map((tile) => tile.short_code));
    const palette_key = textures.prepare(entries, plan);
    const items = [],
      transfers = [];
    let maximum_height = 0;
    for (const { mesh, tile, key } of entries) {
      if (!active.has(tile.short_code)) continue;
      const item = { key, short_code: tile.short_code };
      const colored = texture_keys
        ? texture_keys[key] === palette_key
        : available.has(key) && current_palette_key === palette_key;
      if (!colored) {
        item.pixels = textures.pixels(mesh, key).slice();
        transfers.push(item.pixels.buffer);
      }
      if (!available.has(key)) {
        for (const name of ["positions", "uvs", "indices"]) {
          item[name] = mesh[name].slice();
          transfers.push(item[name].buffer);
        }
      }
      maximum_height = Math.max(maximum_height, mesh.metadata.maximum_height);
      items.push(item);
      emit({
        progress: {
          stage: "colors",
          value: 70 + Math.floor((items.length / entries.length) * 30),
        },
      });
    }
    if (active_id === id) {
      if (!failures.length)
        last_view = {
          palette_key,
          selection_key,
          available_codes: entries.map((entry) => entry.tile.short_code),
          maximum_height,
          items: items.map(({ key, short_code }) => ({ key, short_code })),
        };
      self.postMessage(
        {
          id,
          result: {
            plan: resolved,
            items,
            failures: gap_failures,
            detail_failures,
            cache_hits,
            maximum_height,
            palette_key,
            escape_scale: scale,
          },
        },
        transfers,
      );
    }
  } catch (error) {
    if (!request.signal.aborted) emit({ error: error.message });
  }
};
