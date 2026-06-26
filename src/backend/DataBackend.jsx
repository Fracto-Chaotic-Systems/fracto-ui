import {FRACTO_DATA_PORT, FRACTO_UI_PORT} from "../../../../constants.js";
import {FETCH_JSON_HEADERS} from "../pages/study/StudyUtils.jsx";
import {copy_json} from "../utils/Dom.jsx";
import * as JSON from "postcss";

export class DataBackend {

   static get_orbital = (focal_point, limit, cb) => {
      const origin = window.origin
         .replace(`${FRACTO_UI_PORT}`, `${FRACTO_DATA_PORT}`)
      setTimeout(async () => {
         const all_params = [
            `re=${focal_point.x}`,
            `im=${focal_point.y}`,
            `limit=${limit}`,
         ].join('&')
         const url = `${origin}/orbital?${all_params}`
         const point_data = await fetch(url, FETCH_JSON_HEADERS)
            .then(response => response.json())
         cb(point_data)
      }, 250)
   }

   static get_orbitals = (focal_point, limit, cb) => {
      const origin = window.origin
         .replace(`${FRACTO_UI_PORT}`, `${FRACTO_DATA_PORT}`)
      setTimeout(async () => {
         const all_params = [
            `re=${focal_point.x}`,
            `im=${focal_point.y}`,
            `limit=${limit}`,
         ].join('&')
         const url = `${origin}/orbitals?${all_params}`
         const point_data = await fetch(url, FETCH_JSON_HEADERS)
            .then(response => response.json())
         cb(point_data)
      }, 250)
   }

   static lore_storage = async (
      meta_data,
      item_data,
      category,
      on_update_meta) => {
      const content_data = JSON.stringify(item_data);
      const content_meta = JSON.stringify(meta_data);
      ['type', 'key', 'title']
         .forEach(key => delete content_data[key])
      const body = {
         title: item_data.title,
         category: category.id,
         content_data,
         content_meta,
         key: `${category.key_prefix}${item_data.key}`,
      }
      console.log('lore_storage body', body)

      const origin = window.origin.replace(`${FRACTO_UI_PORT}`, `${FRACTO_DATA_PORT}`)
      const url = `${origin}/lore_storage`
      const response = await fetch(url, {
         method: 'PUT',
         headers: {
            'Content-Type': 'application/json', // Signals JSON data format
         },
         body: JSON.stringify(body) // Converts JS object to JSON string
      });
      const data = await response.json();
      console.log('lore_storage response', data)
      on_update_meta(meta_data);
   }
}

export default DataBackend
