import {
   KEY_ADMIN_IDENTITY_FORM_SAVE, KEY_ADMIN_IDENTITY_FORM_SUBTITLE,
   KEY_ADMIN_IDENTITY_FORM_TITLE,
   KEY_OPERATOR_CONSENT_LABEL,
   KEY_OPERATOR_EMAIL_LABEL,
   KEY_OPERATOR_EMAIL_PROMPT,
   KEY_OPERATOR_NAME_LABEL,
   KEY_OPERATOR_NAME_PROMPT
} from "../text/AdminText.jsx";
import {
   KEY_ID_OPERATOR_CONSENT,
   KEY_ID_OPERATOR_EMAIL,
   KEY_ID_OPERATOR_NAME
} from "../settings/AdminSettings.jsx";

export const OPERATOR_ID_FORM = {
   form_entries: [
      {
         label_key: KEY_OPERATOR_NAME_LABEL,
         prompt_key: KEY_OPERATOR_NAME_PROMPT,
         width_px: 250,
         required: true,
         settings_key: KEY_ID_OPERATOR_NAME,
      },
      {
         label_key: KEY_OPERATOR_EMAIL_LABEL,
         prompt_key: KEY_OPERATOR_EMAIL_PROMPT,
         width_px: 250,
         required: true,
         settings_key: KEY_ID_OPERATOR_EMAIL,
      },
      {
         label_key: KEY_OPERATOR_CONSENT_LABEL,
         required: true,
         label_width_px: 400,
         settings_key: KEY_ID_OPERATOR_CONSENT,
      },
   ],
   form_meta: {
      form_title_key: KEY_ADMIN_IDENTITY_FORM_TITLE,
      default_button_key: KEY_ADMIN_IDENTITY_FORM_SAVE,
      form_subtitle_key: KEY_ADMIN_IDENTITY_FORM_SUBTITLE,
   }
}