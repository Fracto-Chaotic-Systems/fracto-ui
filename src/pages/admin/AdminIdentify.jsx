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
   KEY_OPERATOR_CONSENT_LABEL,
   KEY_OPERATOR_EMAIL_LABEL,
   KEY_OPERATOR_EMAIL_PROMPT,
   KEY_OPERATOR_NAME_LABEL,
   KEY_OPERATOR_NAME_PROMPT
} from "../../text/AdminText.jsx";

const FORM_ENTRIES = [
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
      label_width_px: 425,
      settings_key: KEY_ID_OPERATOR_CONSENT,
   }
]

export class AdminIdentify extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'identiy-title'}>
            {AppText.get(KEY_IDENTIFY_TITLE)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            <InputForm form_entries={FORM_ENTRIES}/>
         </styles.CenteredBlock>,
      ];
   }
}

export default AdminIdentify
