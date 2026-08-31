import {FRACTO_DATA_PORT} from "../../../../constants.js";
import {FETCH_JSON_HEADERS} from "../pages/study/StudyUtils.jsx";
import {service_origin} from "../utils/service_origin.jsx";

const DATA_ORIGIN = service_origin(FRACTO_DATA_PORT)

const MAX_DENOMINATOR = 128

export class DataBackend {
   
   static get_minibrots = (params, cb) => {
      setTimeout(async () => {
         const all_params = Object.keys(params).map(key => {
            return `${key}=${params[key]}`;
         }).join('&');
         const url = `${DATA_ORIGIN}/minibrots?${all_params}`
         const minibrots = await fetch(url, FETCH_JSON_HEADERS)
            .then(response => response.json())
         cb(minibrots.result)
      }, 250)
   }
   
   static get_orbital = (focal_point, limit, cb) => {
      setTimeout(async () => {
         const all_params = [
            `re=${focal_point.x}`,
            `im=${focal_point.y}`,
            `limit=${limit}`,
         ].join('&')
         const url = `${DATA_ORIGIN}/orbital?${all_params}`
         const point_data = await fetch(url, FETCH_JSON_HEADERS)
            .then(response => response.json())
         cb(point_data)
      }, 250)
   }
   
   static get_orbitals = (focal_point, limit, cb) => {
      setTimeout(async () => {
         const all_params = [
            `re=${focal_point.x}`,
            `im=${focal_point.y}`,
            `limit=${limit}`,
         ].join('&')
         const url = `${DATA_ORIGIN}/orbitals?${all_params}`
         try {
            const point_data = await fetch(url, FETCH_JSON_HEADERS)
               .then(response => response.json())
            console.log('get_orbitals point_data', point_data)
            cb(point_data)
         } catch (err) {
            cb({error: err.message})
         }
      }, 250)
   }
   
   static lore_content_listing = (category_id, cb) => {
      const url = `${DATA_ORIGIN}/lore_storage`
      setTimeout(async () => {
         const all_params = [
            `category_id=${category_id}`,
         ].join('&')
         const url = `${DATA_ORIGIN}/lore_content_list?${all_params}`
         const category_list = await fetch(url, FETCH_JSON_HEADERS)
            .then(response => response.json())
         cb(category_list)
      }, 250)
   }
   
   static lore_storage = async (content) => {
      const {content_data, content_meta, id, title, category, category_key} = content
      content_meta.can_store = false
      console.log('lore_storage content', content)
      try {
         const body = {
            title,
            category,
            content_data,
            content_meta,
            category_key,
         }
         if (id > 0) {
            body.id = id
         }
         
         const url = `${DATA_ORIGIN}/lore_storage`
         const body_str = JSON.stringify(body)
         console.log('lore_storage body_str', body_str)
         const response = await fetch(url, {
            method: 'PUT',
            headers: {
               'Content-Type': 'application/json', // Signals JSON data format
            },
            body: body_str,
         });
         const data = await response.json();
         console.log('lore_storage response', data)
      } catch (e) {
         console.error('lore_storage response', e.message);
      }
   }
   
   FAREY_SEQUENCE = []
   
   static get_farey_sequence = async () => {
      if (DataBackend.FAREY_SEQUENCE?.length > 0) {
         return DataBackend.FAREY_SEQUENCE
      }
      const url = `${DATA_ORIGIN}/utils/farey_sequence`
      const full_farey_sequence = await fetch(url, {}).then(res => res.json())
      const farey_sequence = full_farey_sequence
         .filter(f => f.den <= MAX_DENOMINATOR)
         .filter(f => f.num > 0 && f.den > 2)
      // console.log(`${farey_sequence.length} members in farey_sequence`)
      DataBackend.FAREY_SEQUENCE = farey_sequence.map(element => {
         return {
            num: parseInt(element.num),
            den: parseInt(element.den),
            ratio: parseFloat(element.ratio),
         }
      })
      return DataBackend.FAREY_SEQUENCE
   }
}

export default DataBackend
