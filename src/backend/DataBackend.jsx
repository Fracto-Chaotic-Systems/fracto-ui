import {FRACTO_DATA_PORT, FRACTO_UI_PORT} from "../../../../constants.js";
import {FETCH_JSON_HEADERS} from "../pages/study/StudyUtils.jsx";
import {copy_json} from "../utils/Dom.jsx";

const DATA_ORIGIN = window.origin.replace(
    `${FRACTO_UI_PORT}`,
    `${FRACTO_DATA_PORT}`)

export class DataBackend {

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
            const point_data = await fetch(url, FETCH_JSON_HEADERS)
                .then(response => response.json())
            cb(point_data)
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

    static lore_storage = async (
        meta_data,
        item_data,
        category,
        on_update_meta) => {
        try {
            const title = item_data.title;
            const key = item_data.key;
            ['type', 'key', 'title']
                .forEach(key => delete item_data[key])
            const body = {
                title: title,
                category: category.id,
                content_data: item_data,
                content_meta: meta_data,
                category_key: `${category.key_prefix}${key}`,
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
            on_update_meta(meta_data);
        } catch (e) {
            console.error('lore_storage response', e.message);
        }
    }
}

export default DataBackend
