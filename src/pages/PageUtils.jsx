import AppSettings from "../AppSettings.jsx";
import {KEY_VIEWPORT_DIMENSIONS} from "../settings/RootSettings.jsx";
import {KEY_ASSETS_SPLITTER_POS_PX} from "../settings/AssetsSettings.jsx";

export const update_dimensions = (rendered_width, rendered_height, splitter_key) => {
   const viewport_dimensions = AppSettings.get(KEY_VIEWPORT_DIMENSIONS)
   const splitter_width = AppSettings.get(splitter_key)
   const rendered_width_changed = rendered_width !== viewport_dimensions.width - splitter_width
   const rendered_height_changed = rendered_height !== viewport_dimensions.height
   if (rendered_height_changed || rendered_width_changed) {
      // console.log('update_dimensions, rendered_width_changed, rendered_height_changed',
      //    viewport_dimensions, rendered_width_changed, rendered_height_changed)
      return {
         rendered_width: viewport_dimensions.width - splitter_width,
         rendered_height: viewport_dimensions.height,
      }
   }
   return null
}
