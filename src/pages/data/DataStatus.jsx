import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import {KEY_DATA_STATUS} from "../../text/DataText.jsx";

export class DataStatus extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'data-status-title'}>
            {AppText.get(KEY_DATA_STATUS)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            content
         </styles.CenteredBlock>,
      ];
   }
}

export default DataStatus
