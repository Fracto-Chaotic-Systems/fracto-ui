import axios from "axios";

import {
   FRACTO_TILES_PORT,
} from "../../../../constants.js";
import {service_origin} from "../utils/service_origin.jsx";
import {request_json} from "./BackendUtils.jsx";

const FRACTO_PROD_URL = import.meta.env.VITE_FRACTO_PROD_URL
   || 'https://fracto.mikehallstudio.com'

export class TilesBackend {

   static cache_status = () => request_json(`${service_origin(FRACTO_TILES_PORT)}/cache_status`)

   static tile_coverage = params => request_json(
      `${service_origin(FRACTO_TILES_PORT)}/tile_coverage?${new URLSearchParams(params)}`)

   static canvas_buffer = (data_endpoint, params) => request_json(
      `${service_origin(FRACTO_TILES_PORT)}/${data_endpoint}?${new URLSearchParams(params)}`)

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
