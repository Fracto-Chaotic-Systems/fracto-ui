import {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import {KEY_TILES_LOGS} from "../../text/TilesText.jsx";
import {FRACTO_TILES_PORT} from "../../../../../constants.js";
import {KEY_VIEWPORT_DIMENSIONS} from "../../settings/RootSettings.jsx";
import AppSettings from "../../AppSettings.jsx"
import {KEY_TILES_SPLITTER_POS_PX} from "../../settings/TilesSettings.jsx";

export class TilesLogs extends Component {

   state = {
      console_lines: []
   }

   componentDidMount() {
      this.load_logs_data()
   }

   componentDidUpdate(prevProps, prevState, snapshot) {
   }

   load_logs_data = async () => {
      const url = `http://localhost:${FRACTO_TILES_PORT}/logs`
      const response = await fetch(url)
      const data = await response.json()
      this.setState({console_lines: data.lines})
   }

   render() {
      const {console_lines} = this.state
      const rendered_lines = console_lines.map((line, i) => {
         return <styles.ConsoleLine
            key={`console-line-${i}`}>
            {line}
         </styles.ConsoleLine>
      })
      const viewport_dimensions = AppSettings.get(KEY_VIEWPORT_DIMENSIONS)
      const sidebar_position_px = AppSettings.get(KEY_TILES_SPLITTER_POS_PX)
      const console_style = {
         width: `${viewport_dimensions.width - sidebar_position_px - 20}px`,
         height: `${viewport_dimensions.height - 100}px`,
         overflowX: 'auto',
         overflowY: 'scroll',
         maxWidth: `${viewport_dimensions.height}px`
      }
      console.log('console_style', console_style)
      return [
         <styles.SectionTitle
            key={'tiles-status-title'}>
            {AppText.get(KEY_TILES_LOGS)}
         </styles.SectionTitle>,
         <styles.CenteredBlock
            style={console_style}
            key={'input-form'}>
            <styles.ConsoleWrapper>
               {rendered_lines}
            </styles.ConsoleWrapper>
         </styles.CenteredBlock>,
      ];
   }
}

export default TilesLogs
