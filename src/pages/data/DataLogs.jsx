import {KEY_DATA_SPLITTER_POS_PX} from "../../settings/DataSettings.jsx";
import {FRACTO_DATA_PORT} from "../../../../../constants.js";
import {MainStyles as styles} from '../../styles/MainStyles.jsx'

import AppText from "../../AppText.jsx";
import {KEY_DATA_CONTENT_LOGS} from "../../text/DataText.jsx";

import LogViewer from "../../utils/ui/LogViewer.jsx";

export const DataLogs = () => {
   return <LogViewer
      port={FRACTO_DATA_PORT}
      splitter_key={KEY_DATA_SPLITTER_POS_PX}
      title={<styles.SectionTitle>{AppText.get(KEY_DATA_CONTENT_LOGS)}</styles.SectionTitle>}
   />
}

export default DataLogs
