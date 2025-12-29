import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {KEY_TILES_SPLITTER_POS_PX} from "../../settings/TilesSettings.jsx";

import AppText from "../../AppText.jsx";
import {KEY_TILES_LOGS} from "../../text/TilesText.jsx";

import {FRACTO_TILES_PORT} from "../../../../../constants.js";
import {
   load_logs_data,
   render_lines
} from "../../utils/console_render.jsx";

export class TilesLogs extends Component {

   state = {
      logs_data: {},
      interval: null
   }

   componentDidMount() {
      const interval = setInterval(async () => {
         const logs_data = await load_logs_data(FRACTO_TILES_PORT, KEY_TILES_SPLITTER_POS_PX)
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
            key={'tiles-status-title'}>
            {AppText.get(KEY_TILES_LOGS)}
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

export default TilesLogs
