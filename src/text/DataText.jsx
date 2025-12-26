const DATA_FOLDER = 'data'
const MYSQL_FOLDER = `${DATA_FOLDER}/mysql`
const AWS_FOLDER = `${DATA_FOLDER}/aws`

export const KEY_DATA_CONTENT_OVERVIEW = `${DATA_FOLDER}/overview`
export const KEY_DATA_CONTENT_SETTINGS = `${DATA_FOLDER}/settings`
export const KEY_DATA_CONTENT_STATUS = `${DATA_FOLDER}/status`
export const KEY_DATA_CONTENT_LOGS = `${DATA_FOLDER}/logs`

export const KEY_DATA_MYSQL_HOST_LABEL = `${MYSQL_FOLDER}/host_label`
export const KEY_DATA_MYSQL_HOST_PROMPT = `${MYSQL_FOLDER}/host_prompt`
export const KEY_DATA_MYSQL_PORT_LABEL = `${MYSQL_FOLDER}/port_label`
export const KEY_DATA_MYSQL_PORT_PROMPT = `${MYSQL_FOLDER}/port_prompt`
export const KEY_DATA_MYSQL_USER_LABEL = `${MYSQL_FOLDER}/user_label`
export const KEY_DATA_MYSQL_USER_PROMPT = `${MYSQL_FOLDER}/user_prompt`
export const KEY_DATA_MYSQL_SAVE = `${MYSQL_FOLDER}/save`
export const KEY_DATA_MYSQL_FORM_TITLE = `${MYSQL_FOLDER}/form_title`
export const KEY_DATA_MYSQL_FORM_SUBTITLE = `${MYSQL_FOLDER}/form_subtitle`

export const KEY_DATA_AWS_ACCESSKEYID_LABEL = `${AWS_FOLDER}/accesskeyid_label`
export const KEY_DATA_AWS_ACCESSKEYID_PROMPT = `${AWS_FOLDER}/accesskeyid_prompt`
export const KEY_DATA_AWS_SECRETACCESSKEY_LABEL = `${AWS_FOLDER}/secretaccesskey_label`
export const KEY_DATA_AWS_SECRETACCESSKEY_PROMPT = `${AWS_FOLDER}/secretaccesskey_prompt`
export const KEY_DATA_AWS_FORM_TITLE = `${AWS_FOLDER}/form_title`
export const KEY_DATA_AWS_FORM_SUBTITLE = `${AWS_FOLDER}/form_subtitle`
export const KEY_DATA_AWS_FORM_SAVE = `${AWS_FOLDER}/form_save`

export const KEY_DATA_MAIN_SERVER_LABEL = `${DATA_FOLDER}/main_server_label`
export const KEY_DATA_MAIN_SERVER_PROMPT = `${DATA_FOLDER}/main_server_prompt`
export const KEY_DATA_MAIN_SERVER_FORM_TITLE = `${DATA_FOLDER}/main_server_form_title`
export const KEY_DATA_MAIN_SERVER_FORM_SUBTITLE = `${DATA_FOLDER}/main_server_form_subtite`
export const KEY_DATA_MAIN_SERVER_FORM_SAVE = `${DATA_FOLDER}/main_server_form_save`

export const APP_DATA_TEXT = {
   [KEY_DATA_CONTENT_OVERVIEW]: 'data overview',
   [KEY_DATA_CONTENT_SETTINGS]: 'data settings',
   [KEY_DATA_CONTENT_STATUS]: 'data status',
   [KEY_DATA_CONTENT_LOGS]: 'data logs',
   [KEY_DATA_MYSQL_HOST_LABEL]: "host",
   [KEY_DATA_MYSQL_HOST_PROMPT]: "localhost?",
   [KEY_DATA_MYSQL_PORT_LABEL]: "port",
   [KEY_DATA_MYSQL_PORT_PROMPT]: "3306?",
   [KEY_DATA_MYSQL_USER_LABEL]: "user",
   [KEY_DATA_MYSQL_USER_PROMPT]: "root?",
   [KEY_DATA_MYSQL_SAVE]: "save mysql settings",
   [KEY_DATA_MYSQL_FORM_TITLE]: "MySQL Connection",
   [KEY_DATA_MYSQL_FORM_SUBTITLE]: "Enter the connection details to the Fracto MySQL database",
   [KEY_DATA_AWS_ACCESSKEYID_LABEL]: "access key id",
   [KEY_DATA_AWS_ACCESSKEYID_PROMPT]: "required",
   [KEY_DATA_AWS_SECRETACCESSKEY_LABEL]: "secret access key",
   [KEY_DATA_AWS_SECRETACCESSKEY_PROMPT]: "required",
   [KEY_DATA_AWS_FORM_TITLE]: "AWS Connection",
   [KEY_DATA_AWS_FORM_SUBTITLE]: "Enter the keys to connect to AWS",
   [KEY_DATA_AWS_FORM_SAVE]: "save aws settings",
   [KEY_DATA_MAIN_SERVER_LABEL]: "main server url",
   [KEY_DATA_MAIN_SERVER_PROMPT]: "required",
   [KEY_DATA_MAIN_SERVER_FORM_TITLE]: "Main Server Connection",
   [KEY_DATA_MAIN_SERVER_FORM_SUBTITLE]: "Specify the remote server connection details",
   [KEY_DATA_MAIN_SERVER_FORM_SAVE]: "save main server setting"
}
