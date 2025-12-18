import {
   KEY_DATA_AWS_ACCESSKEYID_LABEL,
   KEY_DATA_AWS_ACCESSKEYID_PROMPT,
   KEY_DATA_AWS_FORM_SAVE,
   KEY_DATA_AWS_FORM_SUBTITLE,
   KEY_DATA_AWS_FORM_TITLE,
   KEY_DATA_AWS_SECRETACCESSKEY_LABEL,
   KEY_DATA_AWS_SECRETACCESSKEY_PROMPT,
} from "../text/DataText.jsx";
import {
   KEY_DATA_AWS_ACCESSKEYID,
   KEY_DATA_AWS_SECRETACCESSKEY,
} from "../settings/DataSettings.jsx";

export const AWS_CONNECTION_FORM = {
   form_entries: [
      {
         label_key: KEY_DATA_AWS_ACCESSKEYID_LABEL,
         prompt_key: KEY_DATA_AWS_ACCESSKEYID_PROMPT,
         width_px: 200,
         required: true,
         settings_key: KEY_DATA_AWS_ACCESSKEYID,
      },
      {
         label_key: KEY_DATA_AWS_SECRETACCESSKEY_LABEL,
         prompt_key: KEY_DATA_AWS_SECRETACCESSKEY_PROMPT,
         width_px: 200,
         required: true,
         settings_key: KEY_DATA_AWS_SECRETACCESSKEY,
      },
   ],
   form_meta: {
      form_title_key: KEY_DATA_AWS_FORM_TITLE,
      form_subtitle_key: KEY_DATA_AWS_FORM_SUBTITLE,
      default_button_key: KEY_DATA_AWS_FORM_SAVE,
   }
}