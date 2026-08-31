import {Component} from "react";
import PropTypes from "prop-types";

import {CoolTable} from "../../../utils/ui/CoolImports.jsx";
import {
   FRACTO_DATA_PORT
} from "../../../../../../constants.js";
import FractoUtil from "../../../../../../sdk/FractoUtil.js";
import {service_origin} from "../../../utils/service_origin.jsx";

import {
   CELL_ALIGN_CENTER,
   CELL_ALIGN_LEFT,
   CELL_TYPE_CALLBACK,
   CELL_TYPE_NUMBER,
   TABLE_CAN_SELECT,
   TABLE_NO_BORDER,
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import {StudyStyles as styles} from "../../../styles/StudyStyles.jsx";
import {KEY_STUDY_MAGNITUDES_RATIO_ARRAY} from "../../../settings/StudySettings.jsx";
import AppSettings from "../../../AppSettings.jsx";

const TABLE_COLUMNS = [
   {
      id: "num",
      label: "num",
      type: CELL_TYPE_NUMBER,
      width_px: 35,
      align: CELL_ALIGN_CENTER,
   },
   {
      id: "den",
      label: "den",
      type: CELL_TYPE_CALLBACK,
      width_px: 50,
      align: CELL_ALIGN_CENTER,
   },
   {
      id: "ratio",
      label: "ratio",
      type: CELL_TYPE_NUMBER,
      width_px: 210,
      align: CELL_ALIGN_LEFT,
   },
]
const CONTROL_BAR_HEIGHT_PX = 18
const MAX_DENOMINATOR = 128

export class FareySequenceList extends Component {
   static propTypes = {
      height_px: PropTypes.number.isRequired,
   }

   state = {
      farey_sequence: [],
      selected_rows: [],
   }

   componentDidMount() {
      const selected_rows = AppSettings.get(KEY_STUDY_MAGNITUDES_RATIO_ARRAY)
      this.setState({selected_rows})
      setTimeout(this.get_farey_sequence, 150)
   }

   get_farey_sequence = async () => {
      const origin = service_origin(FRACTO_DATA_PORT)
      const url = `${origin}/utils/farey_sequence`
      const full_farey_sequence = await fetch(url, {}).then(res => res.json())
      const farey_sequence = full_farey_sequence
         .filter(f => f.den <= MAX_DENOMINATOR)
         .filter(f => f.num > 0 && f.den > 2)
      this.setState({farey_sequence})
      console.log(`${farey_sequence.length} members in farey_sequence`)
   }

   select_row = (row, enabled) => {
      const {selected_rows} = this.state
      // console.log('selected row', row, enabled)
      if (!selected_rows.includes(row)) {
         selected_rows.push(row)
         this.setState({selected_rows})
         AppSettings.on_settings_changed({
            [KEY_STUDY_MAGNITUDES_RATIO_ARRAY]: selected_rows
         })
      } else if (selected_rows.includes(row)) {
         const new_selection = selected_rows.filter(r => r !== row)
         this.setState({selected_rows: new_selection})
         AppSettings.on_settings_changed({
            [KEY_STUDY_MAGNITUDES_RATIO_ARRAY]: new_selection
         })
      }
   }

   render_den = (den) => {
      const extra_style = {
         backgroundColor: FractoUtil.fracto_pattern_color(den, 100),
      }
      return <styles.DenominatorCell
         style={extra_style}>
         {den}
      </styles.DenominatorCell>
   }

   render() {
      const {farey_sequence, selected_rows} = this.state
      const {height_px} = this.props
      const table_data = farey_sequence.map((f, row) => {
         return {
            num: f.num,
            den: [this.render_den, f.den],
            ratio: f.ratio,
         }
      })
      return <CoolTable
         columns={TABLE_COLUMNS}
         data={table_data}
         table_style={{
            height: `${height_px}px`,
            width: !farey_sequence.length ? '24rem': 'inherit',
         }}
         options={[TABLE_NO_BORDER, TABLE_CAN_SELECT]}
         on_select_row={this.select_row}
         selected_rows={selected_rows}
      />
   }
}

export default FareySequenceList
