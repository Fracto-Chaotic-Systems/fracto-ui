import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import {KEY_ADMIN_LOGS} from "../../text/AdminText.jsx";

export class AdminLogs extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'admin-status-title'}>
            {AppText.get(KEY_ADMIN_LOGS)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            content
         </styles.CenteredBlock>,
      ];
   }
}

export default AdminLogs
