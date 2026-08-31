import {FRACTO_DATA_PORT} from "../../../../constants.js";
import {FETCH_JSON_HEADERS} from "../pages/study/StudyUtils.jsx";
import {service_origin} from "../utils/service_origin.jsx";
import {request_json} from "./BackendUtils.jsx";

const DATA_ORIGIN = service_origin(FRACTO_DATA_PORT)

const MAX_DENOMINATOR = 128

export class DataBackend {

   /**
    * Fetches the newest rows from a whitelisted database table.
    * @param {string} table Table name accepted by the data server query route.
    * @param {number} [limit=1000] Maximum number of rows to return.
    * @returns {Promise<{result: Object[]}>} Rows ordered by descending id.
    * @calledBy AdminQueries
    */
   static query_table = (table, limit = 1000) => request_json(
      `${DATA_ORIGIN}/query?${new URLSearchParams({table, limit: `${limit}`, order: 'id DESC'})}`)

   /**
    * Requests the status of a table backup operation.
    * @param {string} table Table name to inspect.
    * @returns {Promise<Object>} Data-server backup status payload.
    * @calledBy DataBackups (legacy maintenance view)
    */
   static backup_status = table => request_json(`${DATA_ORIGIN}/backup?table=${encodeURIComponent(table)}`)

   /**
    * Retrieves radian/vector data for a rational angle.
    * @param {number} [theta_num=5] Angle numerator.
    * @param {number} [theta_den=11] Angle denominator.
    * @param {number} [precision=24] Requested calculation precision.
    * @returns {Promise<Object[]>} Radian data returned by the data server.
    * @calledBy OrbitalMagnitudes
    */
   static radian_data = (theta_num = 5, theta_den = 11, precision = 24) => request_json(
      `${DATA_ORIGIN}/radian_data?${new URLSearchParams({theta_num, theta_den, precision})}`)

   /**
    * Lists minibrot records using the supplied query parameters.
    * @param {Object} params Data-server query parameters.
    * @param {Function} cb Called with the returned result array.
    * @returns {void} The request is deferred by 250ms.
    * @calledBy MinibrotList, AssetsDetector
    */
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
   
   /**
    * Retrieves orbital points for one focal point.
    * @param {{x:number,y:number}} focal_point Complex-plane focal point.
    * @param {number} limit Maximum number of points.
    * @param {Function} cb Called with the service response.
    * @returns {void} The request is deferred by 250ms.
    * @calledBy study point/orbital views
    */
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
   
   /**
    * Retrieves multiple orbital series for one focal point.
    * @param {{x:number,y:number}} focal_point Complex-plane focal point.
    * @param {number} limit Maximum number of points.
    * @param {Function} cb Called with the response or an error object.
    * @returns {void} The request is deferred by 250ms.
    * @calledBy PointsMainPanel
    */
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
   
   /**
    * Lists lore content for a category.
    * @param {number|string} category_id Lore category identifier.
    * @param {Function} cb Called with the service response.
    * @returns {void} The request is deferred by 250ms.
    * @calledBy LoreContentList
    */
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
   
   /**
    * Stores or updates lore content through the data service.
    * @param {Object} content Content payload containing metadata and optional id.
    * @returns {Promise<void>} Resolves after the request is handled; errors are logged.
    * @calledBy LoreUtils, LoreMetaData
    * @note Mutates content_meta.can_store before sending and does not return the saved record.
    */
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
   
   /**
    * Loads and caches the filtered Farey sequence.
    * @returns {Promise<Object[]>} Positive terms with denominator <= 128.
    * @calledBy FareySequenceList, StudyMeridians
    * @note Subsequent callers use the in-memory DataBackend.FAREY_SEQUENCE cache.
    */
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
