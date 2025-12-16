import {Component} from "react";
import InputForm from "../utils/InputForm.jsx";
import {
   KEY_ID_OPERATOR_CONSENT,
   KEY_ID_OPERATOR_EMAIL,
   KEY_ID_OPERATOR_NAME
} from "../../settings/AdminSettings.jsx";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'

const FORM_ENTRIES = [
   {
      label: "Operator name",
      prompt: "may be phony",
      width_px: 250,
      required: true,
      settings_key: KEY_ID_OPERATOR_NAME,
   },
   {
      label: "Operator email",
      prompt: "must be real",
      width_px: 250,
      required: true,
      settings_key: KEY_ID_OPERATOR_EMAIL,
   },
   {
      label: "Clicking this checkbox has no affect. The intention is to enable consent but in a court of law it has no standing whatsoever. However, clicking it will allow you to continue using the application, so it may be worth your while to do so",
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
            identify
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            <InputForm form_entries={FORM_ENTRIES}/>
         </styles.CenteredBlock>,
      ];
   }
}

export default AdminIdentify
