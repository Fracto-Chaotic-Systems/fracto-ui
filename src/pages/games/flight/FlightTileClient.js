import TilesBackend from "../../../backend/TilesBackend.jsx";
import { create_flight_tile_cache } from "@fracto/sdk/flight/TileCache.js";

/** Production transport adapter; create once per game and destroy on cleanup. */
export function create_flight_tile_client(options = {}) {
  return create_flight_tile_cache({
    ...options,
    load_tile: (code, request_options) =>
      TilesBackend.tile(code, request_options),
    load_availability: (codes, request_options) =>
      TilesBackend.tile_availability(codes, request_options),
  });
}
