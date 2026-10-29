import {
  terrain_palette,
  terrain_palette_mapper,
} from "@fracto/sdk/terrain/Palette.js";
import FractoCanvasBuffer from "@fracto/sdk/FractoCanvasBuffer.js";

/** Stable base-view tones and a small color cache keep local refinement from recoloring distant tiles. */
export default class SimulatorMeshTextures {
  cache = new Map();
  key_for(plan) {
    const base = plan.base_tiles || plan.tiles;
    return JSON.stringify([
      plan.region,
      plan.namespace,
      base.map((tile) => [tile.short_code, tile.sha256, tile.instances]),
    ]);
  }
  prepare(entries, plan) {
    const base = plan.base_tiles || plan.tiles;
    const by_code = new Map(
      entries.map((entry) => [entry.tile.short_code, entry.mesh]),
    );
    const present = base.filter((tile) => by_code.has(tile.short_code));
    const key =
      this.key_for(plan) +
      (present.length === base.length
        ? ""
        : `|partial:${present.map((tile) => tile.short_code).join(",")}`);
    if (key === this.key) return key;
    this.mapper = terrain_palette_mapper(
      terrain_palette(
        base
          .filter((tile) => by_code.has(tile.short_code))
          .map((tile) => ({ tile, mesh: by_code.get(tile.short_code) })),
        plan.region,
      ),
    );
    this.key = key;
    this.cache.clear();
    return key;
  }
  pixels(mesh, key) {
    if (this.cache.has(key)) {
      const pixels = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, pixels);
      return pixels;
    }
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
      this.mapper(mesh),
    );
    const pixels = context.getImageData(0, 0, 256, 256).data;
    this.cache.set(key, pixels);
    while (this.cache.size > 128)
      this.cache.delete(this.cache.keys().next().value);
    return pixels;
  }
}
