import {TYPE_OBJECT, TYPE_STRING} from "./AppSettings.jsx";

const ROOT_FOLDER = 'root'
export const KEY_ROOT_SERVER_STATUS = `${ROOT_FOLDER}/server_status`
export const KEY_SELECTED_PAGE = `${ROOT_FOLDER}/selected_page`

export const APP_ROOT_SETTINGS = {
   [KEY_SELECTED_PAGE]: {
      data_type: TYPE_STRING,
      default_value: 'admin',
      description: 'status of every server attached to the current instance',
      persist: true,
   },
}
