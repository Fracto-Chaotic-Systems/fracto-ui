import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {KEY_ADMIN_SPLITTER_POS_PX} from "../../settings/AdminSettings.jsx";
import {FRACTO_ADMIN_PORT} from "../../../../../constants.js";

import AppText from "../../AppText.jsx";
import {KEY_ADMIN_LOGS} from "../../text/AdminText.jsx";

import {
   load_logs_data,
   render_lines
} from "../../utils/console_render.jsx";

export class AdminLogs extends Component {

   state = {
      logs_data: {},
      interval: null
   }

   componentDidMount() {
      const interval = setInterval(async () => {
         const logs_data = await load_logs_data(FRACTO_ADMIN_PORT, KEY_ADMIN_SPLITTER_POS_PX)
         this.setState({logs_data})
      }, 1000)
      this.setState({interval})
   }

   componentWillUnmount() {
      const {interval} = this.state
      if (interval) {
         clearInterval(interval)
      }
   }

   render() {
      const {logs_data} = this.state
      const rendered_lines = render_lines(logs_data.console_lines || [])
      const console_style = {
         height: `${logs_data.content_area?.height_px || 0}px`,
         maxWidth: `${logs_data.content_area?.height_px || 0}px`,
         overflowX: 'auto',
         overflowY: 'scroll',
      }
      return [
         <styles.SectionTitle
            key={'admin-status-title'}>
            {AppText.get(KEY_ADMIN_LOGS)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            style={console_style}
            key={'input-form'}>
            <styles.FilenameWrapper>
               {logs_data.logfile_name || 'loading file...'}
            </styles.FilenameWrapper>
            <styles.ConsoleWrapper>
               {rendered_lines}
            </styles.ConsoleWrapper>
         </styles.CenteredBlock>,
      ];
   }
}

export default AdminLogs
