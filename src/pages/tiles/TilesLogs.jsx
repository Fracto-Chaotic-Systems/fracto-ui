import {KEY_TILES_LOGS_SHOW_TIMESTAMPS, KEY_TILES_SPLITTER_POS_PX} from "../../settings/TilesSettings.jsx";
import {MainStyles as styles} from '../../styles/MainStyles.jsx'

import AppText from "../../AppText.jsx";
import {KEY_TILES_LOGS} from "../../text/TilesText.jsx";

import {FRACTO_TILES_PORT} from "../../../../../constants.js";
import LogViewer from "../../utils/ui/LogViewer.jsx";

export const TilesLogs = () => {
   return <LogViewer
      port={FRACTO_TILES_PORT}
      splitter_key={KEY_TILES_SPLITTER_POS_PX}
      timestamp_key={KEY_TILES_LOGS_SHOW_TIMESTAMPS}
      title={<styles.SectionTitle>{AppText.get(KEY_TILES_LOGS)}</styles.SectionTitle>}
   />
}

export default TilesLogs
