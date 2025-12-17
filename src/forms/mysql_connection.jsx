import {
   KEY_DATA_MYSQL_FORM_SUBTITLE,
   KEY_DATA_MYSQL_FORM_TITLE,
   KEY_DATA_MYSQL_HOST_LABEL,
   KEY_DATA_MYSQL_HOST_PROMPT,
   KEY_DATA_MYSQL_PORT_LABEL,
   KEY_DATA_MYSQL_PORT_PROMPT,
   KEY_DATA_MYSQL_SAVE,
   KEY_DATA_MYSQL_USER_LABEL,
   KEY_DATA_MYSQL_USER_PROMPT
} from "../text/DataText.jsx";
import {
   KEY_DATA_MYSQL_HOST,
   KEY_DATA_MYSQL_PORT,
   KEY_DATA_MYSQL_USER
} from "../settings/DataSettings.jsx";

export const MYSQL_CONNECTION_FORM = {
   form_entries: [
      {
         label_key: KEY_DATA_MYSQL_HOST_LABEL,
         prompt_key: KEY_DATA_MYSQL_HOST_PROMPT,
         width_px: 200,
         required: true,
         settings_key: KEY_DATA_MYSQL_HOST,
      },
      {
         label_key: KEY_DATA_MYSQL_PORT_LABEL,
         prompt_key: KEY_DATA_MYSQL_PORT_PROMPT,
         width_px: 200,
         required: true,
         settings_key: KEY_DATA_MYSQL_PORT,
      },
      {
         label_key: KEY_DATA_MYSQL_USER_LABEL,
         prompt_key: KEY_DATA_MYSQL_USER_PROMPT,
         width_px: 200,
         required: true,
         settings_key: KEY_DATA_MYSQL_USER,
      },
   ],
   form_meta: {
      form_title_key: KEY_DATA_MYSQL_FORM_TITLE,
      form_subtitle_key: KEY_DATA_MYSQL_FORM_SUBTITLE,
      default_button_key: KEY_DATA_MYSQL_SAVE,
   }
}