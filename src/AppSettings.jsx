import {copy_json} from "./utils/Dom.js";

export const TYPE_STRING = typeof 'abc'
export const TYPE_NUMBER = typeof 123
export const TYPE_OBJECT = typeof {abc: 123}
export const TYPE_ARRAY = typeof ['abc', 123]
export const TYPE_BOOLEAN = typeof true

export class AppSettings {

   static setting_definitions = {}
   static settings_data = {}
   static settings_initialized = false

   static get = (key) => {
      if (key in AppSettings.setting_definitions) {
         if (key in AppSettings.settings_data) {
            if (typeof AppSettings.settings_data[key] === 'object') {
               return copy_json(AppSettings.settings_data[key])
            }
            return AppSettings.settings_data[key]
         }
         return AppSettings.setting_definitions[key].default_value
      } else {
         console.log('key not found', key, AppSettings.setting_definitions, AppSettings.settings_data)
      }
      return undefined
   }

   static initialize = (setting_definitions) => {
      AppSettings.setting_definitions = copy_json(setting_definitions);
      const page_settings_keys = Object.keys(AppSettings.setting_definitions)
      page_settings_keys.forEach(key => {
         if ("default_value" in AppSettings.setting_definitions[key]) {
            AppSettings.settings_data[key] = AppSettings.setting_definitions[key].default_value
         } else {
            switch (AppSettings.setting_definitions[key].data_type) {
               case TYPE_STRING:
                  AppSettings.settings_data[key] = '~';
                  break
               case TYPE_NUMBER:
                  AppSettings.settings_data[key] = -1;
                  break
               case TYPE_OBJECT:
                  AppSettings.settings_data[key] = {};
                  break
               case TYPE_ARRAY:
                  AppSettings.settings_data[key] = [];
                  break
               case TYPE_BOOLEAN:
                  AppSettings.settings_data[key] = false;
                  break
               default:
                  break;
            }
         }
      })
      AppSettings.load_settings()
      AppSettings.settings_initialized = true
      console.log('settings_initialized')
   }

   static persist_settings = (new_settings) => {
      const all_new_keys = Object.keys(new_settings)
      all_new_keys
         .filter(key => AppSettings.setting_definitions[key] && AppSettings.setting_definitions[key].persist)
         .forEach(key => {
            const key_settings = AppSettings.setting_definitions[key]
            switch (key_settings.data_type) {
               case TYPE_BOOLEAN:
                  localStorage.setItem(key, !!new_settings[key])
                  break
               case TYPE_STRING:
                  localStorage.setItem(key, new_settings[key])
                  break
               case TYPE_NUMBER:
                  localStorage.setItem(key, `${new_settings[key]}`)
                  break
               case TYPE_OBJECT:
               case TYPE_ARRAY:
                  localStorage.setItem(key, JSON.stringify(new_settings[key]))
                  break
               default:
                  console.log('persist_settings bad data_type', key_settings.data_type)
                  break;
            }
         })
   }

   static load_settings = () => {
      const persist_key_names = Object.keys(AppSettings.setting_definitions)
         .filter(key => AppSettings.setting_definitions[key] && AppSettings.setting_definitions[key].persist)
      persist_key_names.forEach(key => {
         const setting_str = localStorage.getItem(key)
         if (setting_str) {
            switch (AppSettings.setting_definitions[key].data_type) {
               case TYPE_BOOLEAN:
                  AppSettings.settings_data[key] = !!setting_str;
                  break;
               case TYPE_STRING:
                  AppSettings.settings_data[key] = setting_str;
                  break;
               case TYPE_NUMBER:
                  AppSettings.settings_data[key] = parseFloat(setting_str);
                  break;
               case TYPE_OBJECT:
               case TYPE_ARRAY:
                  AppSettings.settings_data[key] = JSON.parse(setting_str);
                  break;
               default:
                  console.log('load_settings bad data_type',
                     AppSettings.setting_definitions[key].data_type)
                  break;
            }
         }
      })
   }

   static test_update_settings = (setting_keys, props, stored_values) => {
      let settings_changed = false
      setting_keys.forEach((key) => {
         let current_value = props[key]
         let previous_value = stored_values[key]
         if (typeof current_value === 'object') {
            current_value = JSON.stringify(current_value)
            previous_value = JSON.stringify(previous_value)
         }
         if (current_value !== previous_value) {
            settings_changed = true
            stored_values[key] = props[key];
         }
      })
      return settings_changed;
   }

   static on_settings_changed = (new_settings) => {
      const new_settings_keys = Object.keys(new_settings)
      new_settings_keys.forEach((key) => {
         const key_definition = AppSettings.setting_definitions[key]
         if (!key_definition) {
            console.log('key_definition not found', key)
            return
         }
         switch (key_definition.data_type) {
            case TYPE_BOOLEAN:
               AppSettings.settings_data[key] = !!new_settings[key]
               break
            case TYPE_ARRAY:
            case TYPE_OBJECT:
               if (typeof new_settings[key] !== 'object') {
                  break;
               }
               AppSettings.settings_data[key] =
                  copy_json(new_settings[key])
               break
            default:
               AppSettings.settings_data[key] = new_settings[key]
               break;
         }
      })
      AppSettings.persist_settings(new_settings)
   }
}

export default AppSettings
