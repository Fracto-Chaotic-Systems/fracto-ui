import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {KEY_ADMIN_OVERVIEW} from "../../text/AdminText.jsx";
import AppText from "../../AppText.jsx";

export class AdminOverview extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'identiy-title'}>
            {AppText.get(KEY_ADMIN_OVERVIEW)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            content
         </styles.CenteredBlock>,
      ];
   }
}

export default AdminOverview
