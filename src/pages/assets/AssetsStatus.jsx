import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import {KEY_ASSETS_STATUS} from "../../text/AssetsText.jsx";

export class AssetsStatus extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'assets-status-title'}>
            {AppText.get(KEY_ASSETS_STATUS)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            content
         </styles.CenteredBlock>,
      ];
   }
}

export default AssetsStatus
