import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import {KEY_ASSETS_LORE, KEY_ASSETS_STATUS} from "../../text/AssetsText.jsx";

export class AssetsLore extends Component {

   state = {
      logs_data: {},
      interval: null
   }

   componentDidMount() {
   }

   componentWillUnmount() {
   }

   render() {
      return [
         <styles.SectionTitle
            key={'assets-status-title'}>
            {AppText.get(KEY_ASSETS_LORE)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            Fracto Lore
         </styles.CenteredBlock>,
      ];
   }
}

export default AssetsLore
