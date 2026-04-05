import React, {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {KEY_STUDY_OVERVIEW} from "../../text/StudyText.jsx";
import AppText from "../../AppText.jsx";
import FractoRasterImage from "../../utils/render/FractoRasterImage.jsx";

export class StudyOverview extends Component {
   render() {
      return [
         <styles.SectionTitle
            key={'study-overview-title'}>
            {AppText.get(KEY_STUDY_OVERVIEW)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            key={'input-form'}>
            <FractoRasterImage
               width_px={50}
               focal_point={{x: 0, y: 0}}
               scope={4}
               data_endpoint={'hyper_canvas_buffer'}
            />
         </styles.CenteredBlock>,
      ];
   }
}

export default StudyOverview
