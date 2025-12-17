import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {KEY_STUDY_SETTINGS} from "../../text/StudyText.jsx";
import AppText from "../../AppText.jsx";

export class StudySettings extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'study-settings-title'}>
            {AppText.get(KEY_STUDY_SETTINGS)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            content
         </styles.CenteredBlock>,
      ];
   }
}

export default StudySettings
