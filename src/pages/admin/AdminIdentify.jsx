import {Component} from "react";
import InputForm from "../utils/InputForm.jsx";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {AppText} from "../../AppText.jsx";
import {KEY_IDENTIFY_TITLE} from "../../text/AdminText.jsx";
import {OPERATOR_ID_FORM} from "../../forms/operator_id.jsx";

export class AdminIdentify extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'identiy-title'}>
            {AppText.get(KEY_IDENTIFY_TITLE)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            <InputForm
               form_entries={OPERATOR_ID_FORM.form_entries}
               form_meta={OPERATOR_ID_FORM.form_meta}
            />
         </styles.CenteredBlock>,
      ];
   }
}

export default AdminIdentify
