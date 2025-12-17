import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {KEY_ASSETS_OVERVIEW} from "../../text/AssetsText.jsx";
import AppText from "../../AppText.jsx";

export class AssetsOverview extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'assets-overview-title'}>
            {AppText.get(KEY_ASSETS_OVERVIEW)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            content
         </styles.CenteredBlock>,
      ];
   }
}

export default AssetsOverview
