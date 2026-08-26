import React, {Component} from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import ReactTimeAgo from "react-time-ago";

import {MainStyles as styles, MARGIN_PX} from '../../../styles/MainStyles.jsx'
import {
   CELL_ALIGN_CENTER,
   CELL_ALIGN_LEFT,
   CELL_TYPE_CALLBACK,
   CELL_TYPE_NUMBER,
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
import {checkmark_icon} from "../../../utils/ui/CoolIcons.jsx";
import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";
import {
   GENERATOR_CODE_REDO
} from "./GeneratorControl.jsx";

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
      width_px: 80,
      type: CELL_TYPE_CALLBACK,
      align: CELL_ALIGN_CENTER,
   },
   {
      id: "done_at",
      label_key: KEY_TILES_GENERATOR_DONE_AT,
      width_px: 120,
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

const SummaryRow = styled(CoolStyles.Block)`
    line-height: 1.25rem;
`

export class GeneratorHistory extends Component {
   static propTypes = {
      all_records: PropTypes.array.isRequired,
      generate_code: PropTypes.string.isRequired,
      tile_index: PropTypes.number.isRequired,
      tile_count: PropTypes.number.isRequired,
   }

   state = {
      subset_records: [],
      records_length: -1,
      run_start: null,
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
         this.setState({
            run_start: performance.now()
         })
      }
   }

   process_records = () => {
      const {run_start} = this.state
      const {all_records, tile_index} = this.props
      const subset_records = all_records
         .slice(-20)
         .sort((a, b) => a.tile_index > b.tile_index ? -1 : 1)
      if (subset_records.length > 0) {
         this.setState({
            subset_records,
            records_length: all_records.length,
         })
      }
      if (tile_index === 0 && !run_start) {
         this.setState({
            run_start: performance.now()
         })
      }
   }

   render_duration = (duration) => {
      const duration_text = `${Math.round(duration) / 1000}`
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

   stats_summary = () => {
      const {all_records, generate_code} = this.props
      let blank_count = 0
      let interior_count = 0
      let new_count = 0
      all_records.forEach((record) => {
         if (record.is_blank) {
            blank_count++
         } else if (record.is_interior) {
            interior_count++
         } else {
            new_count++
         }
      })
      const all_forms = []
      if (blank_count) {
         all_forms.push(`${blank_count} blank`)
      }
      if (interior_count) {
         all_forms.push(`${interior_count} interior`)
      }
      if (new_count) {
         let descriptor = 'new'
         if (generate_code === GENERATOR_CODE_REDO) {
            descriptor = 'redone'
         // } else if (generate_code === GENERATOR_CODE_NEEDS_UPDATE) {
         //    descriptor = 'updated'
         }
         all_forms.push(`${new_count} ${descriptor}`)
      }
      return all_forms.join(', ')
   }

   render_summary_line_1 = () => {
      const {subset_records, run_start} = this.state
      const extra_style = {
         fontStyle: 'italic',
         fontSize: '1.125rem',
         marginLeft: '1rem',
         color: '#666666',
      }
      const run_count = subset_records[0].tile_index + 1
      const run_time = performance.now()
      const tiles_per_minute = 60 * 1000 * (run_count) / (run_time - run_start)
      const rounded_tiles_per_minute = Math.round(100 * tiles_per_minute) / 100
      const rate_str = `${rounded_tiles_per_minute} tiles/min`
      const stats_str = this.stats_summary()
      const text = subset_records.length > 0
         ? `${run_count} results this run (${rate_str}): ${stats_str}`
         : ''
      return <SummaryRow
         style={extra_style}>
         {text}
      </SummaryRow>
   }

   render_summary_line_2 = () => {
      const {run_start, subset_records} = this.state
      const {tile_count} = this.props
      let time_stats = ''
      if (subset_records.length) {
         const run_count = subset_records[0].tile_index + 1
         if (run_count && run_start) {
            const timer_now = performance.now()
            const time_to_complete =
               (timer_now - run_start)
               * (tile_count - run_count) / (run_count + 1)
            const now = Date.now()
            const then = new Date(now + time_to_complete);
            const dateString = then.toString()
            time_stats = [
               'Started ',
               <ReactTimeAgo date={Date.now() - (timer_now - run_start)}/>,
               run_count < tile_count - 1 ? ', may complete ' : ', might have completed ',
               <ReactTimeAgo date={Date.now() + time_to_complete}/>,
               ` (${dateString.substring(0, dateString.indexOf('GMT') - 1)})`
            ]
         }
      }
      const extra_style = {
         fontSize: '0.90rem',
         color: '#444444',
         marginLeft: '1rem',
         fontFamily: 'Courier',
         fontWeight: 'bold',
         textTransform: 'uppercase',
         whiteSpace: 'nowrap',
         overflow: 'hidden',
      }
      return <SummaryRow
         style={extra_style}>
         {time_stats}
      </SummaryRow>
   }

   render() {
      const {subset_records} = this.state
      const {tile_index} = this.props
      if (tile_index < 0 || !subset_records.length) {
         return []
      }
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
      const wrapper_style = {
         marginLeft: '1rem',
      }
      const summary_line_1 = this.render_summary_line_1()
      const summary_line_2 = this.render_summary_line_2()
      return <styles.ContentWrapper
         style={wrapper_style}>
         {summary_line_1}
         {summary_line_2}
         <styles.HalfRemDown/>
         <CoolTable
            columns={TABLE_COLUMNS}
            data={table_data}
            options={[]}
         />
      </styles.ContentWrapper>
   }
}

export default GeneratorHistory
