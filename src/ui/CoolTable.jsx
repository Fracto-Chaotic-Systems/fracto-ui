import React, {Component} from 'react';
import PropTypes from 'prop-types';
import styled from "styled-components";

import {CoolStyles} from "./CoolImports";
import ReactTimeAgo from 'react-time-ago';
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'

TimeAgo.locale(en)

export const CELL_TYPE_OBJECT = "cell_type_oject"
export const CELL_TYPE_NUMBER = "cell_type_number"
export const CELL_TYPE_TEXT = "cell_type_text"
export const CELL_TYPE_SELECT = "cell_type_select"
export const CELL_TYPE_LINK = "cell_type_link"
export const CELL_TYPE_TIME_AGO = "cell_type_time_ago"
export const CELL_TYPE_CALLBACK = "cell_type_callback"

export const CELL_ALIGN_LEFT = "cell_align_left"
export const CELL_ALIGN_RIGHT = "cell_align_right"
export const CELL_ALIGN_CENTER = "cell_align_center"

export const TABLE_CAN_SELECT = "table_can_select"
const COLUMN_ID_SELECT = "column_id_select"

const HEADER_COLUMN_SELECT = {
   id: COLUMN_ID_SELECT,
   label: '-',
   type: CELL_TYPE_OBJECT,
   width_px: 10,
   align: CELL_ALIGN_CENTER
}

const MainTable = styled(CoolStyles.Table)`
    border: 0.1rem solid #aaaaaa;
`

const TableRow = styled(CoolStyles.TableRow)`
    padding: 0 0.125rem;

    &: hover {
        ${CoolStyles.pointer}
        background-color: #eeeeee;
    }
`

const TableCell = styled(CoolStyles.TableCell)`
    ${CoolStyles.ellipsis}
    padding: 0.25rem 0.5rem 0 0.75rem;
`

const SelectorCell = styled(CoolStyles.TableCell)`
    padding: 0 0.375rem;
`

const HeaderSpan = styled(CoolStyles.InlineBlock)`
    ${CoolStyles.uppercase}
    ${CoolStyles.narrow_text_shadow}
    color: white;
    font-size: 0.70rem;
    letter-spacing: 1px;
    padding: 0.125rem 0.5rem;
    background-color: #888888;
    margin: 0.125rem 0;
`

const TableHeader = styled(CoolStyles.TableHeader)`
    background-color: #dddddd;
    padding: 0;
`
const HeaderCell = styled(CoolStyles.TableCell)`
    ${CoolStyles.noselect}
    padding: 0.125rem 0 0.125rem 0.25rem;
`

const TableBody = styled(CoolStyles.TableBody)`
    padding: 0.125rem;
`

const TableScrollable = styled(CoolStyles.Block)`
    overflow-x: hidden;
    overflow-y: auto;
`

export const NumericSpan = styled.span`
    ${CoolStyles.monospace}
    ${CoolStyles.ellipsis}
`

const LinkSpan = styled.span`
    ${CoolStyles.link}
`

export class CoolTable extends Component {

   static propTypes = {
      columns: PropTypes.array.isRequired,
      data: PropTypes.array.isRequired,
      on_select_row: PropTypes.func,
      on_click_column: PropTypes.func,
      options: PropTypes.array,
      selected_row: PropTypes.number,
   }

   static defaultProps = {
      options: [],
      selected_row: -1
   }

   state = {}

   render_header_cell = (column) => {
      const {on_click_column} = this.props
      const cell_style = column.width_px ? {minWidth: `${column.width_px}px`} : {}
      if (on_click_column) {
         cell_style.cursor = "pointer"
      }
      if (column.align) {
         switch (column.align) {
            case CELL_ALIGN_LEFT:
               cell_style['textAlign'] = "left";
               break;
            case CELL_ALIGN_RIGHT:
               cell_style['textAlign'] = "right";
               break;
            case CELL_ALIGN_CENTER:
               cell_style['textAlign'] = "center";
               break;
            default:
               console.log("unknown align option", column.align)
               break;
         }
      }
      return <HeaderCell
         key={`header_cell-${column.id}`}
         onClick={e => on_click_column ? on_click_column(column.id) : null}
         style={cell_style}>
         <HeaderSpan
            style={cell_style}>
            {column.label}
         </HeaderSpan>
      </HeaderCell>
   }

   render_cell = (row, col, column, data, id) => {
      // console.log("render_cell = (row, col, column, data, id)", row, col, column, data, id)
      let object_data = data
      switch (column.type) {
         case CELL_TYPE_NUMBER:
            object_data = <NumericSpan>{data}</NumericSpan>
            break;
         case CELL_TYPE_LINK:
            object_data = <LinkSpan onClick={e => {
               column.on_click(id, data)
            }}>{column.alias || data}</LinkSpan>
            break;
         case CELL_TYPE_TIME_AGO:
            object_data = <ReactTimeAgo date={data}/>
            break;
         case CELL_TYPE_CALLBACK:
            if (data[0]) {
               object_data = data[0](data[1])
            }
            break;
         case CELL_TYPE_OBJECT:
         case CELL_TYPE_TEXT:
         default:
            break;
      }
      let cell_style = {maxWidth: `${column.width_px}px`}
      if (column.align) {
         switch (column.align) {
            case CELL_ALIGN_LEFT:
               cell_style['textAlign'] = "left";
               break;
            case CELL_ALIGN_RIGHT:
               cell_style['textAlign'] = "right";
               break;
            case CELL_ALIGN_CENTER:
               cell_style['textAlign'] = "center";
               break;
            default:
               console.log("unknown align option", column.align)
               break;
         }
      }
      if (column["style"]) {
         cell_style = {
            ...cell_style,
            ...column["style"]
         };
      }
      return <TableCell
         style={cell_style}
         key={`cell-${row}-${col}`}>
         {object_data}
      </TableCell>
   }

   render_empty_cell = (row, col) => {
      return <TableCell
         key={`cell-${row}-${col}`}
      />
   }

   render_selector = (row, column) => {
      const {selected_row} = this.props
      const cell_style = column.width_px ? {maxWidth: `${column.width_px}px`} : {}
      return <SelectorCell
         style={cell_style}
         key={`selector-${row}`}>
         <input type={"radio"} checked={selected_row === row}/>
      </SelectorCell>
   }

   render() {
      const {columns, data, options, on_select_row} = this.props
      let columns_clone = columns.slice()
      if (options.includes(TABLE_CAN_SELECT)) {
         columns_clone.unshift(HEADER_COLUMN_SELECT)
      }
      const header_cells = columns_clone.map((column, i) => {
         return this.render_header_cell(column)
      })
      const table_rows = data.map((obj, row) => {
         const row_cells = columns_clone.map((column, col) => {
            if (column.id === COLUMN_ID_SELECT) {
               return this.render_selector(row, column)
            } else if (obj[column.id] !== undefined) {
               return this.render_cell(row, col, column, obj[column.id], obj['id'])
            } else {
               return this.render_empty_cell(row, col)
            }
         })
         return <TableRow
            onClick={e => on_select_row ? on_select_row(row) : console.log("no select callback")}
            key={`row-${row}`}>
            {row_cells}
         </TableRow>
      })
      return <MainTable>
         <TableScrollable>
            <TableHeader>{header_cells}</TableHeader>
            <TableBody>{table_rows}</TableBody>
         </TableScrollable>
      </MainTable>
   }
}

export default CoolTable
