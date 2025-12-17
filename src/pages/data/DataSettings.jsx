import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {KEY_DATA_SETTINGS} from "../../text/DataText.jsx";
import AppText from "../../AppText.jsx";

export class DataSettings extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'data-settings-title'}>
            {AppText.get(KEY_DATA_SETTINGS)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            content
         </styles.CenteredBlock>,
      ];
   }
}

export default DataSettings
