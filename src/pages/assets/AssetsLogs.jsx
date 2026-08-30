import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {KEY_ASSETS_SPLITTER_POS_PX} from "../../settings/AssetsSettings.jsx";
import {FRACTO_ASSET_PORT} from "../../../../../constants.js";

import AppText from "../../AppText.jsx";
import {KEY_ASSETS_LOGS} from "../../text/AssetsText.jsx";

import LogViewer from "../../utils/ui/LogViewer.jsx";

export const AssetsLogs = () => {
   return <LogViewer
      port={FRACTO_ASSET_PORT}
      splitter_key={KEY_ASSETS_SPLITTER_POS_PX}
      title={<styles.SectionTitle>{AppText.get(KEY_ASSETS_LOGS)}</styles.SectionTitle>}
   />
}

export default AssetsLogs
