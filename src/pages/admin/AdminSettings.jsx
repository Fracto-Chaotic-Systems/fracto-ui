import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {KEY_ADMIN_SETTINGS} from "../../text/AdminText.jsx";
import AppText from "../../AppText.jsx";

export class AdminSettings extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'admin-settings-title'}>
            {AppText.get(KEY_ADMIN_SETTINGS)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            content
         </styles.CenteredBlock>,
      ];
   }
}

export default AdminSettings
