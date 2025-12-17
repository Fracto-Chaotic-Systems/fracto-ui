import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import {KEY_TILES_STATUS} from "../../text/TilesText.jsx";

export class TilesStatus extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'tiles-status-title'}>
            {AppText.get(KEY_TILES_STATUS)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            content
         </styles.CenteredBlock>,
      ];
   }
}

export default TilesStatus
