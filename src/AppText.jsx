import {copy_json} from "./utils/Dom.js";

export class AppText {

   static text_keys = []
   static text_data = {}
   static text_initialized = false

   static initialize = (all_text) => {
      AppText.text_data = copy_json(all_text)
      AppText.text_keys = Object.keys(AppText.text_data)
      AppText.text_initialized = true
      console.log('AppText initialized', all_text)
   }

   static get = (key) => {
      if (AppText.text_keys.includes(key)) {
         return AppText.text_data[key]
      } else {
         console.log('text key not found', key, AppText.text_keys)
      }
      return undefined
   }
}

export default AppText
