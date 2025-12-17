import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {KEY_DATA_SETTINGS} from "../../text/DataText.jsx";
import AppText from "../../AppText.jsx";
import InputForm from "../utils/InputForm.jsx";
import {MYSQL_CONNECTION_FORM} from "../../forms/mysql_connection.jsx";

export class DataSettings extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'data-settings-title'}>
            {AppText.get(KEY_DATA_SETTINGS)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            <InputForm
               form_entries={MYSQL_CONNECTION_FORM.form_entries}
               form_meta={MYSQL_CONNECTION_FORM.form_meta}
            />
         </styles.CenteredBlock>,
      ];
   }
}

export default DataSettings
