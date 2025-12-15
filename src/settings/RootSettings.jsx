import AppSettings, {TYPE_OBJECT, TYPE_STRING} from "./AppSettings.jsx";
import {getViewportDimensions} from "../utils/Dom.js";

const ROOT_FOLDER = 'root'
export const KEY_SELECTED_PAGE = `${ROOT_FOLDER}/selected_page`
export const KEY_VIEWPORT_DIMENSIONS = `${ROOT_FOLDER}/viewport_dimensions`

export const APP_ROOT_SETTINGS = {
   [KEY_SELECTED_PAGE]: {
      data_type: TYPE_STRING,
      default_value: 'admin',
      description: 'status of every server attached to the current instance',
      persist: true,
   },
   [KEY_VIEWPORT_DIMENSIONS]: {
      data_type: TYPE_OBJECT,
      default_value: {width: 0, height: 0},
      description: 'width and height of the browser client area',
      persist: false,
   },
}

export const poll_viewport_dimensions = () => {
   return setInterval(() => {
      const current_viewport = AppSettings.get(KEY_VIEWPORT_DIMENSIONS)
      const new_viewport = getViewportDimensions()
      const width_changed = current_viewport?.width !== new_viewport.width
      const height_changed = current_viewport?.height !== new_viewport.height
      if (width_changed || height_changed) {
         console.log('viewport changed', new_viewport)
         AppSettings.on_settings_changed({
            [KEY_VIEWPORT_DIMENSIONS]: new_viewport
         })
      }
   }, 1000)
}
