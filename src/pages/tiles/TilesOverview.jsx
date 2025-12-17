import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {KEY_TILES_OVERVIEW} from "../../text/TilesText.jsx";
import AppText from "../../AppText.jsx";

export class TilesOverview extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'tiles-overview-title'}>
            {AppText.get(KEY_TILES_OVERVIEW)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            content
         </styles.CenteredBlock>,
      ];
   }
}

export default TilesOverview
