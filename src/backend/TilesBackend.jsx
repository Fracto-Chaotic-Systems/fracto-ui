import {
   FRACTO_TILES_PORT,
   FRACTO_UI_PORT
} from "../../../../constants.js";

export class TilesBackend {

   static get_heat_map = async (frame_settings) => {
      const all_params = [
         `width_px=${frame_settings.width_px}`,
         `focal_point_x=${frame_settings.focal_point.x}`,
         `focal_point_y=${frame_settings.focal_point.y}`,
         `scope=${frame_settings.scope}`,
         `aspect_ratio=${1}`,
      ].join('&')
      const origin = window.origin.replace(`${FRACTO_UI_PORT}`, `${FRACTO_TILES_PORT}`)
      const url = `${origin}/heat_map_buffer?${all_params}`
      try {
         const result = await fetch(url, {}).then(res => res.json())
         return result
      } catch (error) {
         console.error(`error fetching ${url}`, error.message)
         return error
      }
   }
}

export default TilesBackend
