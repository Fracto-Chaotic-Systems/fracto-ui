import React, {Component} from "react";
import PropTypes from "prop-types";

import {MainStyles as styles, MARGIN_PX} from '../../../styles/MainStyles.jsx'
import {
   CELL_ALIGN_CENTER,
   CELL_ALIGN_LEFT,
   CELL_TYPE_CALLBACK,
   CELL_TYPE_NUMBER
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import {
   KEY_TILES_GENERATOR_DONE_AT,
   KEY_TILES_GENERATOR_DURATION,
   KEY_TILES_GENERATOR_INDEX,
   KEY_TILES_GENERATOR_IS_BLANK,
   KEY_TILES_GENERATOR_IS_INTERIOR,
   KEY_TILES_GENERATOR_SHORT_CODE
} from "../../../text/TilesText.jsx";
import CoolTable from "../../../utils/ui/CoolTable.jsx";
import ReactTimeAgo from "react-time-ago";
import {checkmark_icon} from "../../../utils/ui/CoolIcons.jsx";
import FractoUtil from "../../../../../../sdk/FractoUtil.js";

const TABLE_COLUMNS = [
   {
      id: "index",
      label_key: KEY_TILES_GENERATOR_INDEX,
      width_px: 60,
      type: CELL_TYPE_NUMBER,
      align: CELL_ALIGN_CENTER,
   },
   {
      id: "duration",
      label_key: KEY_TILES_GENERATOR_DURATION,
      width_px: 60,
      type: CELL_TYPE_CALLBACK,
      align: CELL_ALIGN_CENTER,
   },
   {
      id: "done_at",
      label_key: KEY_TILES_GENERATOR_DONE_AT,
      width_px: 100,
      type: CELL_TYPE_CALLBACK,
      align: CELL_ALIGN_CENTER,
   },
   {
      id: "is_blank",
      label_key: KEY_TILES_GENERATOR_IS_BLANK,
      width_px: 60,
      type: CELL_TYPE_CALLBACK,
      align: CELL_ALIGN_CENTER,
   },
   {
      id: "is_interior",
      label_key: KEY_TILES_GENERATOR_IS_INTERIOR,
      width_px: 60,
      type: CELL_TYPE_CALLBACK,
      align: CELL_ALIGN_CENTER,
   },
   {
      id: "short_code",
      label_key: KEY_TILES_GENERATOR_SHORT_CODE,
      width_px: 240,
      type: CELL_TYPE_CALLBACK,
      align: CELL_ALIGN_LEFT,
   },
]

export class GeneratorHistory extends Component {
   static propTypes = {
      all_records: PropTypes.array.isRequired,
   }

   state = {
      subset_records: [],
      records_length: -1,
   }

   componentDidMount() {
      this.process_records()
   }

   componentDidUpdate(prevProps, prevState, snapshot) {
      const records_length_changed =
         this.props.all_records.length !== this.state.records_length
      const all_records_changed =
         prevProps.all_records.length !== this.props.all_records.length
      if (all_records_changed || records_length_changed) {
         this.process_records()
      }
   }

   process_records = () => {
      const {all_records} = this.props
      const subset_records = all_records
         .slice(-20)
         .sort((a, b) => a.tile_index > b.tile_index ? -1 : 1)
      if (subset_records.length > 0) {
         this.setState({
            subset_records,
            records_length: all_records.length
         })
      }
   }

   render_duration = (duration) => {
      const duration_text = `${Math.round(duration / 10) / 100}`
      return <styles.NumericValue>{duration_text}</styles.NumericValue>
   }

   render_done_at = (timestamp) => {
      return <styles.FormSubtitle>
         <ReactTimeAgo date={timestamp}/>
      </styles.FormSubtitle>
   }

   render_boolean = (value) => {
      const checkmark_style = {
         width: '16px',
         height: '16px',
         fill: 'green',
      }
      return value ? <styles.CenteredCell style={checkmark_style}>
         {checkmark_icon}
      </styles.CenteredCell> : []
   }

   render_short_code = (short_code) => {
      return <styles.NumericValue>{short_code}</styles.NumericValue>
   }

   render() {
      const {subset_records} = this.state
      const table_data = subset_records
         .map((record, i) => {
            return {
               index: record.tile_index + 1,
               duration: [this.render_duration, record.duration],
               done_at: [this.render_done_at, record.timestamp],
               is_blank: [this.render_boolean, record.is_blank],
               is_interior: [this.render_boolean, record.is_interior],
               short_code: [this.render_short_code, record.tile.short_code],
            }
         })
      console.log('subset_records, table_data', subset_records, table_data)
      return <styles.ContentWrapper>
         <CoolTable columns={TABLE_COLUMNS} data={table_data}/>
      </styles.ContentWrapper>
   }
}

export default GeneratorHistory
