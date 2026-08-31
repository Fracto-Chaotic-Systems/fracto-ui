import React, {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import CoolTabs from "../../utils/ui/CoolTabs.jsx";
import {CoolStyles} from "../../utils/ui/CoolImports.jsx";
import {KEY_DATA_CONTENT_QUERIES, KEY_DATA_QUERIES_LOAD_ERROR, KEY_DATA_QUERIES_LOADING, KEY_DATA_QUERY_TABLE_ASSETS, KEY_DATA_QUERY_TABLE_FREE_BAILIWICKS, KEY_DATA_QUERY_TABLE_LORE_CATEGORY, KEY_DATA_QUERY_TABLE_LORE_FILES, KEY_DATA_QUERY_TABLE_TILES} from "../../text/DataText.jsx";
import AppSettings from "../../AppSettings.jsx";
import {KEY_DATA_QUERIES_TAB, KEY_DATA_SPLITTER_POS_PX} from "../../settings/DataSettings.jsx";
import {BACKGROUND_FIELD_GRADIENT} from "../../constants.jsx";
import {update_dimensions} from "../PageUtils.jsx";
import DataBackend from "../../backend/DataBackend.jsx";
import CoolTable from "../../utils/ui/CoolTable.jsx";
import {CELL_ALIGN_LEFT, CELL_TYPE_NUMBER, CELL_TYPE_TEXT} from "../../utils/ui/styles/CoolTableStyles.jsx";

const TABLE_TABS = [
   KEY_DATA_QUERY_TABLE_ASSETS,
   KEY_DATA_QUERY_TABLE_FREE_BAILIWICKS,
   KEY_DATA_QUERY_TABLE_LORE_CATEGORY,
   KEY_DATA_QUERY_TABLE_LORE_FILES,
   KEY_DATA_QUERY_TABLE_TILES,
]

const TABLE_NAMES = ['assets', 'free_bailiwicks', 'lore_category', 'lore_files', 'tiles']
const TABLE_LIMIT = 1000
const TABLE_HEADER_SPACE_PX = 40
const MONOSPACE_CHARACTER_WIDTH_PX = 8
const COLUMN_HORIZONTAL_PADDING_PX = 16
const MIN_COLUMN_WIDTH_PX = 64
const cell_text = value => {
   if (value === null || value === undefined) return ''
   if (typeof value === 'object') return JSON.stringify(value)
   return String(value)
}
const table_columns = records => {
   const fields = [...new Set(records.flatMap(record => Object.keys(record)))]
   return fields.map(field => {
      const sample = records.find(record => record[field] !== null && record[field] !== undefined)?.[field]
      const width_px = Math.ceil(Math.max(
         MIN_COLUMN_WIDTH_PX,
         Math.max(field.length, ...records.map(record => cell_text(record[field]).length))
            * MONOSPACE_CHARACTER_WIDTH_PX + COLUMN_HORIZONTAL_PADDING_PX,
      ) * 1.1)
      return {
         id: field,
         label: field,
         type: typeof sample === 'number' ? CELL_TYPE_NUMBER : CELL_TYPE_TEXT,
         width_px,
         max_width_px: width_px,
         align: CELL_ALIGN_LEFT,
         style: {backgroundColor: 'white', fontFamily: 'monospace'},
      }
   })
}

export class AdminQueries extends Component {
   state = {
      tab_index: 0,
      rendered_width: 0,
      rendered_height: 0,
      dimensions_interval: null,
      field_ref: React.createRef(),
      records: TABLE_NAMES.map(() => []),
      loading: TABLE_NAMES.map(() => false),
      errors: TABLE_NAMES.map(() => null),
   }

   componentDidMount() {
      const saved_tab = AppSettings.get(KEY_DATA_QUERIES_TAB)
      const tab_index = Number.isInteger(saved_tab) && saved_tab >= 0 && saved_tab < TABLE_TABS.length ? saved_tab : 0
      this.setState({tab_index})
      this.update_dimensions()
      this.setState({dimensions_interval: setInterval(this.update_dimensions, 1000)})
      this.load_table(tab_index)
   }

   componentWillUnmount() {
      if (this.state.dimensions_interval) clearInterval(this.state.dimensions_interval)
      this.unmounted = true
   }

   update_dimensions = () => {
      const {rendered_width, rendered_height} = this.state
      const new_values = update_dimensions(rendered_width, rendered_height, KEY_DATA_SPLITTER_POS_PX)
      if (new_values && !this.unmounted) this.setState(new_values)
   }

   on_tab_select = tab_index => {
      AppSettings.on_settings_changed({[KEY_DATA_QUERIES_TAB]: tab_index})
      this.setState({tab_index})
      this.load_table(tab_index)
   }

   load_table = async tab_index => {
      const table = TABLE_NAMES[tab_index]
      if (!table) return
      this.setState(previous => ({
         loading: previous.loading.map((value, index) => index === tab_index ? true : value),
         errors: previous.errors.map((value, index) => index === tab_index ? null : value),
      }))
      try {
         const payload = await DataBackend.query_table(table, TABLE_LIMIT)
         if (this.unmounted) return
         this.setState(previous => ({
            records: previous.records.map((value, index) => index === tab_index ? (payload.result || []) : value),
            loading: previous.loading.map((value, index) => index === tab_index ? false : value),
         }))
      } catch (error) {
         if (!this.unmounted) this.setState(previous => ({
            loading: previous.loading.map((value, index) => index === tab_index ? false : value),
            errors: previous.errors.map((value, index) => index === tab_index ? error.message : value),
         }))
      }
   }

   render() {
      const {tab_index, rendered_height, field_ref, records, loading, errors} = this.state
      const labels = TABLE_TABS.map(key => AppText.get(key))
      const table_records = records[tab_index] || []
      const table_error = errors[tab_index]
      const selected_content = <CoolStyles.Block style={{backgroundColor: 'white', minHeight: '12rem'}}>
         <CoolStyles.Block style={{height: `${TABLE_HEADER_SPACE_PX}px`}} />
         {loading[tab_index] && <CoolStyles.Block>{AppText.get(KEY_DATA_QUERIES_LOADING)}</CoolStyles.Block>}
         {table_error && <CoolStyles.Block style={{color: '#b22222'}}>{AppText.get(KEY_DATA_QUERIES_LOAD_ERROR)} {table_error}</CoolStyles.Block>}
         {!loading[tab_index] && !table_error && <CoolTable
            columns={table_columns(table_records)}
            data={table_records}
            table_style={{backgroundColor: 'white'}}
         />}
      </CoolStyles.Block>
      const field_top = field_ref.current?.getBoundingClientRect()?.top || 0
      const field_height = rendered_height ? Math.max(0, rendered_height - field_top) : undefined
      return <styles.PaneWrapper>
         <styles.SectionTitle>
            {AppText.get(KEY_DATA_CONTENT_QUERIES)}
         </styles.SectionTitle>
         <CoolStyles.Block
            ref={field_ref}
            style={{
               background: BACKGROUND_FIELD_GRADIENT,
               height: field_height ? `${field_height}px` : 'auto',
               overflowY: 'auto',
            }}>
            <CoolTabs
               labels={labels}
               tab_index={tab_index}
               on_tab_select={this.on_tab_select}
               selected_content={selected_content}
            />
         </CoolStyles.Block>
      </styles.PaneWrapper>
   }
}

export default AdminQueries
