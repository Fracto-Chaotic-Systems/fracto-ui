import {
   KEY_DATA_MAIN_SERVER_FORM_SAVE,
   KEY_DATA_MAIN_SERVER_FORM_SUBTITLE,
   KEY_DATA_MAIN_SERVER_FORM_TITLE,
   KEY_DATA_MAIN_SERVER_LABEL,
   KEY_DATA_MAIN_SERVER_PROMPT,
} from "../text/DataText.jsx";
import {
   KEY_DATA_MAIN_SERVER_URL,
} from "../settings/DataSettings.jsx";

export const MAIN_SERVER_FORM = {
   form_entries: [
      {
         label_key: KEY_DATA_MAIN_SERVER_LABEL,
         prompt_key: KEY_DATA_MAIN_SERVER_PROMPT,
         width_px: 250,
         required: true,
         settings_key: KEY_DATA_MAIN_SERVER_URL,
      },
   ],
   form_meta: {
      form_title_key: KEY_DATA_MAIN_SERVER_FORM_TITLE,
      form_subtitle_key: KEY_DATA_MAIN_SERVER_FORM_SUBTITLE,
      default_button_key: KEY_DATA_MAIN_SERVER_FORM_SAVE,
   }
}