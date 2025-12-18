import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {KEY_DATA_CONTENT_OVERVIEW} from "../../text/DataText.jsx";
import AppText from "../../AppText.jsx";

export class DataOverview extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'data-overview-title'}>
            {AppText.get(KEY_DATA_CONTENT_OVERVIEW)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            content
         </styles.CenteredBlock>,
      ];
   }
}

export default DataOverview
