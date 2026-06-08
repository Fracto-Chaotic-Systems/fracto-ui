import {FRACTO_DATA_PORT, FRACTO_UI_PORT} from "../../../../constants.js";
import {FETCH_JSON_HEADERS} from "../pages/study/StudyUtils.jsx";

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
}

export default DataBackend
