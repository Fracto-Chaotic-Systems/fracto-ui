import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {KEY_ASSETS_VIDEO} from "../../text/AssetsText.jsx";
import AppText from "../../AppText.jsx";

export class AssetsVideo extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'assets-video-title'}>
            {AppText.get(KEY_ASSETS_VIDEO)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            AssetsVideo content
         </styles.CenteredBlock>,
      ];
   }
}

export default AssetsVideo
