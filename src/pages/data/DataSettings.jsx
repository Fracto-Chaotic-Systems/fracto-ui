import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {
   KEY_DATA_MYSQL_FORM_TITLE,
   KEY_DATA_MYSQL_HOST_LABEL,
   KEY_DATA_MYSQL_HOST_PROMPT,
   KEY_DATA_MYSQL_PORT_LABEL,
   KEY_DATA_MYSQL_PORT_PROMPT,
   KEY_DATA_MYSQL_SAVE,
   KEY_DATA_MYSQL_USER_LABEL,
   KEY_DATA_MYSQL_USER_PROMPT,
   KEY_DATA_SETTINGS
} from "../../text/DataText.jsx";
import AppText from "../../AppText.jsx";
import {
   KEY_DATA_MYSQL_HOST,
   KEY_DATA_MYSQL_PORT,
   KEY_DATA_MYSQL_USER
} from "../../settings/DataSettings.jsx";
import InputForm from "../utils/InputForm.jsx";

const FORM_ENTRIES = [
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
]

const FORM_META = {
   form_title_key: KEY_DATA_MYSQL_FORM_TITLE,
   default_button_key: KEY_DATA_MYSQL_SAVE,
}

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
               form_entries={FORM_ENTRIES}
               form_meta={FORM_META}
            />
         </styles.CenteredBlock>,
      ];
   }
}

export default DataSettings
