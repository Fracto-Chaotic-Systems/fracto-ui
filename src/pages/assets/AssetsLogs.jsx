import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import {KEY_ASSETS_LOGS} from "../../text/AssetsText.jsx";

export class AssetsLogs extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'assets-status-title'}>
            {AppText.get(KEY_ASSETS_LOGS)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            content
         </styles.CenteredBlock>,
      ];
   }
}

export default AssetsLogs
