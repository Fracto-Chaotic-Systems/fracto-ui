import { Component } from "react";

import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import { KEY_DATA_CONTENT_BACKUPS } from "../../text/DataText.jsx";
import AppText from "../../AppText.jsx";

export class DataOverview extends Component {
  render() {
    return [
      <styles.SectionTitle key={"data-overview-title"}>
        {AppText.get(KEY_DATA_CONTENT_BACKUPS)}
      </styles.SectionTitle>,
      <styles.CenteredBlock key={"input-form"}>
        backups content
      </styles.CenteredBlock>,
    ];
  }
}

export default DataOverview;
