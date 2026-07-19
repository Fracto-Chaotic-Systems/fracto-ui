import {
   FRACTO_ASSET_PORT,
   FRACTO_DATA_PORT,
   FRACTO_UI_PORT
} from "../../../../constants.js";
import {FETCH_JSON_HEADERS} from "../pages/study/StudyUtils.jsx";

export class AssetsBackend {

   static render_image = async (frame_settings, resolution) => {
      const all_params = [
         `width_px=${resolution}`,
         `focal_point_x=${frame_settings.focal_point.x}`,
         `focal_point_y=${frame_settings.focal_point.y}`,
         `scope=${frame_settings.scope}`,
         `resolution_factor=${2.0}`,
         `aspect_ratio=${1}`,
      ].join('&')
      const origin = window.origin.replace(`${FRACTO_UI_PORT}`, `${FRACTO_ASSET_PORT}`)
      const url = `${origin}/render_image?${all_params}`
      try {
         const image_outcome = await fetch(url, {}).then(res => res.json())
         console.log('image_outcome', image_outcome)
         return image_outcome
      } catch (error) {
         console.error(`error fetching ${url}`, error.message)
         return error
      }
   }

   static add_to_gallery = async (image_outcome) => {
      const all_params = [
         `asset_id=${image_outcome.asset_id.replace('img_', '')}`,
         `width=${image_outcome.width_px}`,
         `height=${image_outcome.width_px}`,
         `focal_point_x=${image_outcome.focal_point.x}`,
         `focal_point_y=${image_outcome.focal_point.y}`,
         `scope=${image_outcome.scope}`,
         `filename=${image_outcome.filename}`,
         `public_url=${image_outcome.public_url}`,
         `asset_type=image`,
      ].join('&')
      const origin = window.origin.replace(`${FRACTO_UI_PORT}`, `${FRACTO_DATA_PORT}`)
      const url = `${origin}/asset?${all_params}`
      try {
         const insert_outcome = await fetch(url, {}).then(res => res.json())
         console.log('insert_outcome', insert_outcome)
         return insert_outcome
      } catch (error) {
         console.error(`error fetching ${url}`, error.message)
         return error
      }
   }

   static load_assets = async () => {
      const origin = window.origin.replace(`${FRACTO_UI_PORT}`, `${FRACTO_DATA_PORT}`)
      const url = `${origin}/assets`
      try {
         const fetched = await fetch(url, FETCH_JSON_HEADERS).then(res => {
            return res.json()
         })
         return fetched.result
      } catch (error) {
         console.error(`error fetching ${url}`, error.message)
         return []
      }
   }

   static lore_categories = async () => {
      const origin = window.origin.replace(`${FRACTO_UI_PORT}`, `${FRACTO_DATA_PORT}`)
      const url = `${origin}/lore_categories`
      try {
         const fetched = await fetch(url, FETCH_JSON_HEADERS).then(res => {
            return res.json()
         })
         return fetched.result
      } catch (error) {
         console.error(`error fetching ${url}`, error.message)
         return error
      }
   }

}
