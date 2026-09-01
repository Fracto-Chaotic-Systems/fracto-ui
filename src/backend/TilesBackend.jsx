import axios from "axios";

import {
   FRACTO_TILES_PORT,
} from "../../../../constants.js";
import {service_origin} from "../utils/service_origin.jsx";
import {request_json} from "./BackendUtils.jsx";

const FRACTO_PROD_URL = import.meta.env.VITE_FRACTO_PROD_URL
   || 'https://fracto.mikehallstudio.com'

export class TilesBackend {

   /** Fetches the newest stored benchmark report for legacy and turbo.
    * @returns {Promise<Object>} Report envelopes keyed by strategy, or null when absent.
    * @calledBy TilesTest
    */
   static benchmark_results = () => request_json(
      `${service_origin(FRACTO_TILES_PORT)}/benchmark_results`)

   /** Fetches current tile-cache counters and recent history.
    * @returns {Promise<Object>} Cache status payload with metric fields and history.
    * @calledBy TilesStatus
    */
   static cache_status = () => request_json(`${service_origin(FRACTO_TILES_PORT)}/cache_status`)

   /** Fetches tile coverage for the supplied viewport parameters.
    * @param {Object} params Coverage query parameters.
    * @returns {Promise<Object>} Coverage response from the tile service.
    * @calledBy Coverage
    */
   static tile_coverage = params => request_json(
      `${service_origin(FRACTO_TILES_PORT)}/tile_coverage?${new URLSearchParams(params)}`)

   /** Renders a canvas buffer for a tile-service endpoint.
    * @param {string} data_endpoint Endpoint name, normally canvas_buffer.
    * @param {Object} params Canvas dimensions and focal-point parameters.
    * @returns {Promise<Object>} Response containing canvas_buffer data.
    * @calledBy FractoRasterImage
    */
   static canvas_buffer = (data_endpoint, params) => request_json(
      `${service_origin(FRACTO_TILES_PORT)}/${data_endpoint}?${new URLSearchParams(params)}`)

   /** Fetches a heat-map buffer for a rendered frame.
    * @param {Object} frame_settings Frame dimensions, focal point, and scope.
    * @returns {Promise<Object|Error>} Heat-map response or an error value.
    * @calledBy FractoTileCoverage
    */
   static get_heat_map = async (frame_settings) => {
      const all_params = [
         `width_px=${frame_settings.width_px}`,
         `focal_point_x=${frame_settings.focal_point.x}`,
         `focal_point_y=${frame_settings.focal_point.y}`,
         `scope=${frame_settings.scope}`,
         `aspect_ratio=${1}`,
      ].join('&')
      const origin = service_origin(FRACTO_TILES_PORT)
      const url = `${origin}/heat_map_buffer?${all_params}`
      try {
         return await fetch(url, {}).then(res => res.json())
      } catch (error) {
         console.error(`error fetching ${url}`, error.message)
         return error
      }
   }

   /** Uploads generated tile points to the configured cloud tile endpoint.
    * @param {string} short_code Tile shortcode.
    * @param {Object} tile_points Point payload.
    * @param {string} dir Remote tile classification directory.
    * @returns {void} Starts the Axios request and logs synchronous errors.
    * @calledBy GeneratorInterface
    * @note This is a remote write and intentionally does not use the local tile service.
    */
   static upload_points = (short_code, tile_points, dir) => {
      const url = `${FRACTO_PROD_URL}/new_tile.php?short_code=${short_code}&dir=${dir}`
      try {
         axios.post(url, tile_points, {
            headers: {
               'Access-Control-Allow-Origin': '*',
               'Access-Control-Expose-Headers': 'Access-Control-*',
               'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
            },
            mode: 'no-cors',
            crossdomain: true,
         })
      } catch (e) {
         console.log('upload_points error', e)
      }
   }
}

export default TilesBackend
