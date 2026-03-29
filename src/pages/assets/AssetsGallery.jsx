import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import {KEY_ASSETS_GALLERY} from "../../text/AssetsText.jsx";

export class AssetsGallery extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'assets-overview-title'}>
            {AppText.get(KEY_ASSETS_GALLERY)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            AssetsGallery content
         </styles.CenteredBlock>,
      ];
   }
}

export default AssetsGallery
