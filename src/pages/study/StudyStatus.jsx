import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import {KEY_STUDY_STATUS} from "../../text/StudyText.jsx";

export class StudyStatus extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'study-status-title'}>
            {AppText.get(KEY_STUDY_STATUS)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            content
         </styles.CenteredBlock>,
      ];
   }
}

export default StudyStatus
