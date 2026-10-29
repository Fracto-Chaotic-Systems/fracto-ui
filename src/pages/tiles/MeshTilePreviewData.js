import FractoCanvasBuffer from "@fracto/sdk/FractoCanvasBuffer.js";
import { TERRAIN_HEIGHT_SCOPE_RATIO } from "../assets/SimulatorTerrainData.js";

export { decode_terrain_gzip as decode_preview_mesh } from "@fracto/sdk/terrain/Decode.js";

/** One palette pass supplies both the source image and the mesh texture. */
export function paint_preview_tile(mesh, canvas) {
  const buffer = Array.from({ length: 256 }, (_, x) =>
    Array.from({ length: 256 }, (_, y) => {
      const index = y * 256 + x;
      return mesh.patterns[index] === -2147483648
        ? null
        : [mesh.patterns[index], mesh.iterations[index]];
    }),
  );
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  FractoCanvasBuffer.buffer_to_canvas(buffer, context, canvas.width / 256);
}

/** Tile-local XZ becomes centered, with the simulator's navigator-scope / 25 relief. */
export function preview_positions(mesh, scope, multiplier = 1) {
  const tile_scope = mesh.metadata.bounds.right - mesh.metadata.bounds.left;
  if (!(tile_scope > 0) || !(scope > 0))
    throw new Error("Invalid preview scope");
  const scale =
    ((scope * TERRAIN_HEIGHT_SCOPE_RATIO) / tile_scope) * multiplier;
  const positions = mesh.positions.slice();
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] -= 0.5;
    positions[i + 1] *= scale;
    positions[i + 2] -= 0.5;
  }
  return { positions, maximum_height: mesh.metadata.maximum_height * scale };
}
