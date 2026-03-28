import React, {Component} from "react";

import {
   FRACTO_DATA_PORT,
   FRACTO_UI_PORT
} from "../../../../../constants.js";
import CoolTable from "../../utils/ui/CoolTable.jsx";
import {render_magnitude, render_pattern_block} from "./StudyUtils.jsx";

import {
   MainStyles as styles,
   MARGIN_PX,
   TITLE_BAR_HEIGHT_PX
} from '../../styles/MainStyles.jsx'
import {
   CELL_ALIGN_CENTER,
   CELL_TYPE_CALLBACK,
   CELL_TYPE_NUMBER,
   TABLE_CAN_SELECT,
   TABLE_NO_BORDER
} from "../../utils/ui/styles/CoolTableStyles.jsx";
import AppSettings from "../../AppSettings.jsx";
import {KEY_STUDY_SPLITTER_POS_PX} from "../../settings/StudySettings.jsx";
import {KEY_VIEWPORT_DIMENSIONS} from "../../settings/RootSettings.jsx";
import AppText from "../../AppText.jsx";
import {
   KEY_STUDY_CARDINAL,
   KEY_STUDY_MAGNITUDE,
   KEY_STUDY_MINIBROTS
} from "../../text/StudyText.jsx";

const FETCH_JSON_HEADERS = {
   'Content-Type': 'application/json',
   'Accept': 'application/json'
}

const UPDATE_INTERVAL_MS = 1000
const CARDINAL_WIDTH_PX = 50
const MAGNITUDE_WIDTH_PX = 120
const TABLE_WIDTH_PX =
   CARDINAL_WIDTH_PX
   + MAGNITUDE_WIDTH_PX
   + 70;

const TABLE_COLUMNS = [
   {
      id: "cardinality",
      label_key: KEY_STUDY_CARDINAL,
      width_px: CARDINAL_WIDTH_PX,
      type: CELL_TYPE_CALLBACK,
      align: CELL_ALIGN_CENTER,
   },
   {
      id: "magnitude",
      label_key: KEY_STUDY_MAGNITUDE,
      width_px: MAGNITUDE_WIDTH_PX,
      type: CELL_TYPE_CALLBACK,
      align: CELL_ALIGN_CENTER,
   },
]


export class StudyMinibrots extends Component {
   state = {
      rendered_width: 0,
      rendered_height: 0,
      container_ref: React.createRef(),
      interval: null,
      minibrot_list: [],
      selected_row: -1,
      selected_minibrot: {},
   }

   componentDidMount() {
      this.load_minibrots()
      this.update_dimensions()
      this.setState({
         interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
      })
   }

   componentWillUnmount() {
      const {interval} = this.state
      if (interval) {
         clearInterval(interval)
      }
   }

   load_minibrots = async () => {
      const origin = window.origin.replace(`${FRACTO_UI_PORT}`, `${FRACTO_DATA_PORT}`)
      const url = `${origin}/minibrots`
      console.log('url', url)
      const result = await fetch(url, FETCH_JSON_HEADERS).then(res => {
         return res.json()
      })
      const minibrot_list = result.error
      // console.log('minibrot_list', result)
      this.setState({minibrot_list})
   }

   on_select_row = (row) => {
      const {minibrot_list} = this.state
      this.setState({
         selected_row: row,
         selected_minibrot: minibrot_list[row]
      })
   }

   update_dimensions = () => {
      const viewport_dimensions = AppSettings.get(KEY_VIEWPORT_DIMENSIONS)
      // console.log('viewport_dimensions', viewport_dimensions)
      const splitter_width = AppSettings.get(KEY_STUDY_SPLITTER_POS_PX)
      this.setState({
         rendered_width: viewport_dimensions.width - splitter_width,
         rendered_height: viewport_dimensions.height,
      })
   }

   render() {
      const {
         rendered_height, container_ref,
         minibrot_list, selected_row, selected_minibrot
      } = this.state
      let top = 0;
      let left = 0;
      if (container_ref.current) {
         const container_bounds = container_ref.current.getBoundingClientRect()
         top = container_bounds.top
         left = container_bounds.left
      }
      const table_data = minibrot_list.map((row, index) => {
         return {
            cardinality: [render_pattern_block, row.pattern],
            magnitude: [render_magnitude, row.magnitude],
         }
      })
      const table = <CoolTable
         columns={TABLE_COLUMNS}
         data={table_data}
         options={[TABLE_CAN_SELECT, TABLE_NO_BORDER]}
         selected_row={selected_row}
         on_select_row={this.on_select_row}
      />
      const table_style = {
         height: `${rendered_height - 2 * MARGIN_PX - top + TITLE_BAR_HEIGHT_PX}px`,
         maxWidth: `${TABLE_WIDTH_PX}px`
      }
      // console.log('selected_minibrot', selected_minibrot)
      return [
         <styles.SectionTitle
            key={'study-minibrots-title'}>
            {AppText.get(KEY_STUDY_MINIBROTS)}
         </styles.SectionTitle>,
         <styles.TightCenteredBlock
            ref={container_ref}>
            <styles.ScrollingBlock
               style={table_style}
               key={'input-form'}>
               {table}
            </styles.ScrollingBlock>
         </styles.TightCenteredBlock>
      ];
   }
}

export default StudyMinibrots
