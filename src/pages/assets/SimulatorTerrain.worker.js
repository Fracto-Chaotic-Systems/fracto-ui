import FractoCanvasBuffer from "@fracto/sdk/FractoCanvasBuffer.js";
import { terrain_mesh_data } from "./SimulatorTerrainData.js";
import { smooth_terrain_positions } from "./SimulatorTerrainSmoothing.js";

// Parsing, geometry generation and the standard palette all stay off the UI thread.
self.onmessage = async ({ data }) => {
  try {
    const { url, scope } = data;
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) throw new Error(`Terrain request failed: HTTP ${response.status}`);
    const { canvas_buffer } = await response.json();
    const { positions, valid, ...mesh } = terrain_mesh_data(canvas_buffer, scope);
    const smoothed = smooth_terrain_positions(positions, valid, mesh.width, mesh.height, 100);
    const canvas = new OffscreenCanvas(mesh.width, mesh.height);
    const ctx = canvas.getContext("2d");
    FractoCanvasBuffer.buffer_to_canvas(canvas_buffer, ctx);
    const pixels = ctx.getImageData(0, 0, mesh.width, mesh.height).data;
    self.postMessage({ ...mesh, ...smoothed, pixels }, [
      smoothed.positions.buffer,
      mesh.uvs.buffer, mesh.indices.buffer, pixels.buffer,
    ]);
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
