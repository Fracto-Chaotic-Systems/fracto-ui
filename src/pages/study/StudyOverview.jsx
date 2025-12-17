import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {KEY_STUDY_OVERVIEW} from "../../text/StudyText.jsx";
import AppText from "../../AppText.jsx";

export class StudyOverview extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'study-overview-title'}>
            {AppText.get(KEY_STUDY_OVERVIEW)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            content
         </styles.CenteredBlock>,
      ];
   }
}

export default StudyOverview
