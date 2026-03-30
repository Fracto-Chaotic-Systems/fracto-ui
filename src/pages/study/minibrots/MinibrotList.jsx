import React, {Component} from "react";
import PropTypes from "prop-types";

import {
   FRACTO_DATA_PORT,
   FRACTO_UI_PORT
} from "../../../../../../constants.js";
import CoolTable from "../../../utils/ui/CoolTable.jsx";
import {
   render_magnitude,
   render_pattern_block,
   FETCH_JSON_HEADERS,
} from "../StudyUtils.jsx";

import {
   CELL_ALIGN_CENTER,
   CELL_TYPE_CALLBACK,
   TABLE_CAN_SELECT,
   TABLE_NO_BORDER
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import AppSettings from "../../../AppSettings.jsx";
import {KEY_STUDY_MINIBROTS_SELECTED_ROW} from "../../../settings/StudySettings.jsx";
import {
   KEY_STUDY_CARDINAL,
   KEY_STUDY_MAGNITUDE
} from "../../../text/StudyText.jsx";

const CARDINAL_WIDTH_PX = 50
const MAGNITUDE_WIDTH_PX = 120
export const TABLE_WIDTH_PX =
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

export class MinibrotList extends Component {
   static propTypes = {
      height_px: PropTypes.number.isRequired,
      on_select_minibrot: PropTypes.func.isRequired,
      ready: PropTypes.bool.isRequired,
   }

   state = {
      minibrot_list: [],
      selected_row: -1,
   }

   componentDidMount() {
      this.load_minibrots()
   }

   load_minibrots = async () => {
      const {on_select_minibrot} = this.props

      const origin = window.origin.replace(`${FRACTO_UI_PORT}`, `${FRACTO_DATA_PORT}`)
      const url = `${origin}/minibrots`
      // console.log('url', url)
      const fetched = await fetch(url, FETCH_JSON_HEADERS).then(res => {
         return res.json()
      })
      const minibrot_list = fetched.result
      const selected_row = AppSettings.get(KEY_STUDY_MINIBROTS_SELECTED_ROW)
      const selected_minibrot = minibrot_list[selected_row]
      on_select_minibrot(selected_minibrot)
      this.setState({selected_row, minibrot_list})
   }

   on_select_row = (row) => {
      const {minibrot_list} = this.state
      const {on_select_minibrot} = this.props
      const selected_minibrot = minibrot_list[row]
      this.setState({selected_row: row})
      on_select_minibrot(selected_minibrot)
      AppSettings.on_settings_changed({
         [KEY_STUDY_MINIBROTS_SELECTED_ROW]: row
      })
   }

   render() {
      const {minibrot_list, selected_row} = this.state
      const {height_px, ready} = this.props
      const table_data = minibrot_list.map((row, index) => {
         return {
            cardinality: [render_pattern_block, row.pattern],
            magnitude: [render_magnitude, row.magnitude],
         }
      })
      const table_style = {
         height: `${height_px}px`,
         maxWidth: `${TABLE_WIDTH_PX}px`,
         cursor: ready ? 'pointer' : 'wait',
      }
      const table = <CoolTable
         columns={TABLE_COLUMNS}
         data={table_data}
         options={[TABLE_CAN_SELECT, TABLE_NO_BORDER]}
         selected_row={selected_row}
         on_select_row={this.on_select_row}
      />
      return <div style={table_style}>
         {table}
      </div>
   }
}

export default MinibrotList
