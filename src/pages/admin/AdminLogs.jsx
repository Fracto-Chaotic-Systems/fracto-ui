import {KEY_ADMIN_LOGS_SHOW_TIMESTAMPS, KEY_ADMIN_SPLITTER_POS_PX} from "../../settings/AdminSettings.jsx";
import {FRACTO_ADMIN_PORT} from "../../../../../constants.js";
import {MainStyles as styles} from '../../styles/MainStyles.jsx'

import AppText from "../../AppText.jsx";
import {KEY_ADMIN_LOGS} from "../../text/AdminText.jsx";

import LogViewer from "../../utils/ui/LogViewer.jsx";

export const AdminLogs = () => {
   return <LogViewer
      port={FRACTO_ADMIN_PORT}
      splitter_key={KEY_ADMIN_SPLITTER_POS_PX}
      timestamp_key={KEY_ADMIN_LOGS_SHOW_TIMESTAMPS}
      title={<styles.SectionTitle>{AppText.get(KEY_ADMIN_LOGS)}</styles.SectionTitle>}
   />
}

export default AdminLogs
