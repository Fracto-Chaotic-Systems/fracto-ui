import { Component } from "react";

import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppText from "../../AppText.jsx";
import { KEY_STUDY_FULL_MAP_TITLE } from "../../text/StudyText.jsx";

/** Initial title-only scaffold for the Study section's logistic map page. */
export class StudyFullMap extends Component {
  render() {
    return (
      <styles.SectionTitle>
        {AppText.get(KEY_STUDY_FULL_MAP_TITLE)}
      </styles.SectionTitle>
    );
  }
}

export default StudyFullMap;
