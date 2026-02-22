import {Component} from "react";
import PropTypes from "prop-types";

import {CoolTable} from "../../../utils/ui/CoolImports.jsx";
import {
   CELL_ALIGN_CENTER,
   CELL_ALIGN_LEFT,
   CELL_TYPE_NUMBER,
   TABLE_CAN_SELECT,
   TABLE_NO_BORDER,
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import {
   FRACTO_DATA_PORT,
   FRACTO_UI_PORT
} from "../../../../../../constants.js";

const TABLE_COLUMNS = [
   {
      id: "num",
      label: "num",
      type: CELL_TYPE_NUMBER,
      width_px: 40,
      align: CELL_ALIGN_CENTER,
   },
   {
      id: "den",
      label: "den",
      type: CELL_TYPE_NUMBER,
      width_px: 50,
      align: CELL_ALIGN_CENTER,
   },
   {
      id: "ratio",
      label: "ratio",
      type: CELL_TYPE_NUMBER,
      width_px: 225,
      align: CELL_ALIGN_LEFT,
   },
]

export class FareySequenceList extends Component {
   static propTypes = {
      height_px: PropTypes.number.isRequired,
   }

   state = {
      farey_sequence: [],
   }

   componentDidMount() {
      this.get_farey_sequence()
   }

   get_farey_sequence = async () => {
      const origin = window.origin.replace(`${FRACTO_UI_PORT}`, `${FRACTO_DATA_PORT}`)
      const url = `${origin}/utils/farey_sequence`
      const farey_sequence = await fetch(url, {}).then(res => res.json())
      this.setState({farey_sequence})
      // console.log('farey_sequence', farey_sequence)
   }

   select_row = (row) => {
      console.log('selected row', row)
   }

   render() {
      const {farey_sequence} = this.state
      const {height_px} = this.props
      const sliced = farey_sequence.slice(0, 250)
      return <CoolTable
         columns={TABLE_COLUMNS}
         data={sliced}
         table_style={{height_px}}
         options={[TABLE_NO_BORDER, TABLE_CAN_SELECT]}
         on_select_row={this.select_row}
      />
   }
}

export default FareySequenceList
