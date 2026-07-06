const NAVIGATOR_FOLDER = 'navigator'
const HEAT_MAP_FOLDER = 'heat_map'

export const KEY_NAVIGATOR_SCOPE = `${NAVIGATOR_FOLDER}/scope`
export const KEY_NAVIGATOR_FOCAL_POINT = `${NAVIGATOR_FOLDER}/focal_point`
export const KEY_NAVIGATOR_CURSOR_LOCATION = `${NAVIGATOR_FOLDER}/cursor_location`
export const KEY_NAVIGATOR_SEND_TO = `${NAVIGATOR_FOLDER}/send_to`
export const KEY_NAVIGATOR_COVERAGE = `${NAVIGATOR_FOLDER}/coverage`
export const KEY_HEAT_MAP_CLICK_TO_TEST = `${HEAT_MAP_FOLDER}/click_to_test`
export const KEY_HEAT_MAP_FETCHING = `${HEAT_MAP_FOLDER}/fetching`

export const APP_NAVIGATOR_TEXT = {
   [KEY_NAVIGATOR_SCOPE]: 'scope:',
   [KEY_NAVIGATOR_FOCAL_POINT]: 'focal point:',
   [KEY_NAVIGATOR_CURSOR_LOCATION]: 'cursor location:',
   [KEY_NAVIGATOR_SEND_TO]: 'send to:',
   [KEY_NAVIGATOR_COVERAGE]: 'coverage:',
   [KEY_HEAT_MAP_CLICK_TO_TEST]: 'click to test coverage',
   [KEY_HEAT_MAP_FETCHING]: 'testing tile coverage...',
}
