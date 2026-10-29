import { decode_terrain_gzip } from "@fracto/sdk/terrain/Decode.js";
import { terrain_palette } from "@fracto/sdk/terrain/Palette.js";
import FractoCanvasBuffer from "@fracto/sdk/FractoCanvasBuffer.js";

const cache = new Map();
let controller, active_id, last_view;
const key_of = (plan, tile) =>
  `${plan.namespace}/${tile.short_code}/${tile.sha256}`;

self.onmessage = async ({ data }) => {
  controller?.abort();
  if (data.cancel) {
    active_id = null;
    return;
  }
  const { id, plan, urls, geometry_keys, current_palette_key } = data;
  active_id = id;
  const request = (controller = new AbortController());
  const emit = (message) => {
    if (active_id === id) self.postMessage({ id, ...message });
  };
  try {
    const palette_key = JSON.stringify([
      plan.region,
      plan.tiles.map((tile) => [key_of(plan, tile), tile.instances]),
    ]);
    if (
      last_view?.palette_key === palette_key &&
      current_palette_key === palette_key &&
      last_view.items.every((item) => geometry_keys.includes(item.key))
    ) {
      emit({
        result: {
          ...last_view,
          plan,
          failures: [],
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
            mesh = await decode_terrain_gzip(compressed);
            if (
              mesh.metadata.short_code !== tile.short_code ||
              mesh.metadata.namespace !== plan.namespace
            )
              throw new Error("Mesh identity changed");
          }
          if (request.signal.aborted) return;
          cache.set(key, mesh);
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
    const palette = terrain_palette(entries, plan.region);
    const items = [],
      transfers = [];
    let maximum_height = 0;
    for (const { mesh, tile, key } of entries) {
      const buffer = Array.from({ length: 256 }, (_, x) =>
        Array.from({ length: 256 }, (_, y) => {
          const index = y * 256 + x;
          return mesh.patterns[index] === -2147483648
            ? null
            : [mesh.patterns[index], mesh.iterations[index]];
        }),
      );
      const canvas = new OffscreenCanvas(256, 256),
        context = canvas.getContext("2d");
      FractoCanvasBuffer.buffer_to_canvas(
        buffer,
        context,
        1,
        false,
        null,
        palette,
      );
      const pixels = context.getImageData(0, 0, 256, 256).data;
      const item = { key, short_code: tile.short_code, pixels };
      transfers.push(pixels.buffer);
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
          maximum_height,
          items: items.map(({ key, short_code }) => ({ key, short_code })),
        };
      self.postMessage(
        {
          id,
          result: {
            plan,
            items,
            failures,
            cache_hits,
            maximum_height,
            palette_key,
          },
        },
        transfers,
      );
    }
  } catch (error) {
    if (!request.signal.aborted) emit({ error: error.message });
  }
};
