import React, {Component} from "react";
import PropTypes from "prop-types";

import {MainStyles as styles} from '../../../styles/MainStyles.jsx'
import CoolTable from "../../../utils/ui/CoolTable.jsx";
import {
   CELL_ALIGN_CENTER,
   CELL_TYPE_NUMBER,
   CELL_TYPE_TEXT
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import * as Array from "mathjs";

const TABLE_COLUMNS = [
   {
      id: "level",
      label: "level",
      type: CELL_TYPE_NUMBER,
      width_px: 65,
      align: CELL_ALIGN_CENTER,
   },
   {
      id: "re_do",
      label: "re-do",
      type: CELL_TYPE_NUMBER,
      width_px: 65,
      align: CELL_ALIGN_CENTER,
   },
   {
      id: "can_do",
      label: "can do",
      type: CELL_TYPE_TEXT,
      width_px: 65,
      align: CELL_ALIGN_CENTER,
   },
]

export class GeneratorRun extends Component {
   static propTypes = {
      coverage_data: PropTypes.array.isRequired,
      on_busy: PropTypes.func.isRequired,
   }

   state = {
      can_do_been_done: [],
      re_do_been_done: [],
   }

   componentDidMount() {
   }

   componentDidUpdate(prevProps, prevState, snapshot) {
      const prev_coverage_data_str = JSON.stringify(prevProps.coverage_data)
      const curr_coverage_data_str = JSON.stringify(this.props.coverage_data)
      if (prev_coverage_data_str !== curr_coverage_data_str) {
         this.setState({
            can_do_been_done: [],
            re_do_been_done: [],
         })
      }
   }

   do_it_now = (level) => {
      const {can_do_been_done} = this.state
      const {on_busy} = this.props
      if (can_do_been_done.includes(level)) {
         console.log('been done', level)
         return;
      }
      can_do_been_done.push(level)
      console.log('do_it_now', level)
      on_busy(true)
      this.setState({can_do_been_done})
   }

   re_do_it_now = (level) => {
      const {re_do_been_done} = this.state
      const {on_busy} = this.props
      if (re_do_been_done.includes(level)) {
         console.log('re-do been done', level)
         return;
      }
      re_do_been_done.push(level)
      console.log('do_it_now', level)
      on_busy(true)
      this.setState({re_do_been_done})
   }

   process_coverage = (can_do_been_done, re_do_been_done) => {
      const {coverage_data} = this.props
      if (!Array.isArray(coverage_data)) {
         return []
      }
      return coverage_data
         .filter(item => item.can_do)
         .map((item) => {
            const can_do = can_do_been_done.includes(item.level)
               ? '-'
               : <styles.NormalLink
                  onClick={e => this.do_it_now(item.level)}>
                  <styles.NumericValue>
                     {item.can_do?.length}
                  </styles.NumericValue>
               </styles.NormalLink>
            const re_do = re_do_been_done.includes(item.level)
               ? '-'
               : <styles.NormalLink
                  onClick={e => this.re_do_it_now(item.level)}>
                  {item.count}
               </styles.NormalLink>
            return {
               level: item.level,
               can_do,
               re_do
            }
         })
   }

   render() {
      const {can_do_been_done, re_do_been_done} = this.state
      const table_data = this.process_coverage(
         can_do_been_done, re_do_been_done)
      if (!table_data.length) {
         return []
      }
      console.log('GeneratorRun', table_data)
      return <styles.FixedInlineBlock>
         <CoolTable
            columns={TABLE_COLUMNS}
            data={table_data}
            table_style={{backgroundColor: 'white'}}
         />
      </styles.FixedInlineBlock>
   }
}

export default GeneratorRun

