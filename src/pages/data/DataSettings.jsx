import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {KEY_DATA_CONTENT_SETTINGS} from "../../text/DataText.jsx";
import AppText from "../../AppText.jsx";
import InputForm from "../utils/InputForm.jsx";

import {MYSQL_CONNECTION_FORM} from "../../forms/mysql_connection.jsx";
import {AWS_CONNECTION_FORM} from "../../forms/aws_connection.jsx";
import {MAIN_SERVER_FORM} from "../../forms/main_server.jsx";

export class DataSettings extends Component {

   render() {
      const forms = [
         MAIN_SERVER_FORM,
         MYSQL_CONNECTION_FORM,
         AWS_CONNECTION_FORM,
      ].map(form => {
         return [
            <styles.CenteredBlock>
               <InputForm
                  form_entries={form.form_entries}
                  form_meta={form.form_meta}
               />
            </styles.CenteredBlock>,
            <styles.TightCenteredBlock>
               {`test ${AppText.get(form.form_meta.form_title_key)} now`}
            </styles.TightCenteredBlock>
         ]
      })
      return [
         <styles.SectionTitle
            key={'data-settings-title'}>
            {AppText.get(KEY_DATA_CONTENT_SETTINGS)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            {forms}
         </styles.CenteredBlock>,
      ];
   }
}

export default DataSettings
