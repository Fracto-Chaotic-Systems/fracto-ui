import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {KEY_ASSETS_SETTINGS} from "../../text/AssetsText.jsx";
import AppText from "../../AppText.jsx";

export class AssetsSettings extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'assets-settings-title'}>
            {AppText.get(KEY_ASSETS_SETTINGS)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            content
         </styles.CenteredBlock>,
      ];
   }
}

export default AssetsSettings
