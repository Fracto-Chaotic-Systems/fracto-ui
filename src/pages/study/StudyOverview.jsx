import React, { Component } from "react";

import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import { KEY_STUDY_OVERVIEW } from "../../text/StudyText.jsx";
import AppText from "../../AppText.jsx";
import FractoRasterImage from "../../utils/render/FractoRasterImage.jsx";

export class StudyOverview extends Component {
  render() {
    return [
      <styles.SectionTitle key={"study-overview-title"}>
        {AppText.get(KEY_STUDY_OVERVIEW)}
      </styles.SectionTitle>,
    ];
  }
}

export default StudyOverview;
