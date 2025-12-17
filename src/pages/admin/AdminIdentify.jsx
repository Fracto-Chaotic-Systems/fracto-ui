import {Component} from "react";
import InputForm from "../utils/InputForm.jsx";
import {
   KEY_ID_OPERATOR_CONSENT,
   KEY_ID_OPERATOR_EMAIL,
   KEY_ID_OPERATOR_NAME
} from "../../settings/AdminSettings.jsx";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {AppText} from "../../AppText.jsx";
import {
   KEY_IDENTIFY_TITLE,
   KEY_OPERATOR_CONSENT_PROMPT,
   KEY_OPERATOR_EMAIL_PROMPT,
   KEY_OPERATOR_NAME_PROMPT
} from "../../text/AdminText.jsx";

export class AdminIdentify extends Component {
   render() {
      const form_entries = [
         {
            label: AppText.get(KEY_OPERATOR_NAME_PROMPT),
            prompt: "may be phony",
            width_px: 250,
            required: true,
            settings_key: KEY_ID_OPERATOR_NAME,
         },
         {
            label: AppText.get(KEY_OPERATOR_EMAIL_PROMPT),
            prompt: "must be real",
            width_px: 250,
            required: true,
            settings_key: KEY_ID_OPERATOR_EMAIL,
         },
         {
            label: AppText.get(KEY_OPERATOR_CONSENT_PROMPT),
            required: true,
            label_width_px: 425,
            settings_key: KEY_ID_OPERATOR_CONSENT,
         }
      ]
      return [
         <styles.SectionTitle
            key={'identiy-title'}>
            {AppText.get(KEY_IDENTIFY_TITLE)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            <InputForm form_entries={form_entries}/>
         </styles.CenteredBlock>,
      ];
   }
}

export default AdminIdentify
