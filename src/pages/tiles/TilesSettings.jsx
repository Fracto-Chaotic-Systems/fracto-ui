import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {KEY_TILES_SETTINGS} from "../../text/TilesText.jsx";
import AppText from "../../AppText.jsx";

export class TilesSettings extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'tiles-settings-title'}>
            {AppText.get(KEY_TILES_SETTINGS)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            content
         </styles.CenteredBlock>,
      ];
   }
}

export default TilesSettings
