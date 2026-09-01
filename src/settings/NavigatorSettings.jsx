import {
   TYPE_BOOLEAN,
   TYPE_OBJECT,
   TYPE_STRING,
} from "../AppSettings.jsx";

const NAVIGATOR_FOLDER = 'navigator'

export const KEY_NAVIGATOR_DISABLED = `${NAVIGATOR_FOLDER}/disabled`
export const KEY_NAVIGATOR_HOVER_POINT = `${NAVIGATOR_FOLDER}/hover_point`
export const KEY_NAVIGATOR_CLIENT_POINT = `${NAVIGATOR_FOLDER}/client_point`
export const KEY_NAVIGATOR_SHOW_CROSSHAIRS = `${NAVIGATOR_FOLDER}/show_crosshairs`
export const KEY_NAVIGATOR_STRATEGY = `${NAVIGATOR_FOLDER}/strategy`

export const APP_NAVIGATOR_SETTINGS = {
   [KEY_NAVIGATOR_DISABLED]: {
      data_type: TYPE_BOOLEAN,
      default_value: false,
      description: 'Image cannot change due to ongoing process',
      persist: false,
   },
   [KEY_NAVIGATOR_HOVER_POINT]: {
      data_type: TYPE_OBJECT,
      default_value: {},
      description: 'current hover point over the complex plane',
      persist: false,
   },
   [KEY_NAVIGATOR_CLIENT_POINT]: {
      data_type: TYPE_OBJECT,
      default_value: {},
      description: 'current client coordinates over the canvas',
      persist: false,
   },
   [KEY_NAVIGATOR_SHOW_CROSSHAIRS]: {
      data_type: TYPE_BOOLEAN,
      default_value: false,
      description: 'show or hide the crosshairs',
      persist: false,
   },
   [KEY_NAVIGATOR_STRATEGY]: {
      data_type: TYPE_STRING,
      default_value: 'turbo',
      description: 'canvas rendering strategy',
      persist: true,
   },
}
