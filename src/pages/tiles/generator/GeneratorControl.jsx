import React, {Component} from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import {MainStyles as styles} from '../../../styles/MainStyles.jsx'
import CoolTable from "../../../utils/ui/CoolTable.jsx";
import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";
import {
   CELL_ALIGN_CENTER,
   CELL_TYPE_NUMBER,
   CELL_TYPE_TEXT
} from "../../../utils/ui/styles/CoolTableStyles.jsx";

const LinkedCell = styled(CoolStyles.InlineBlock)`
    margin: 0;
`

const COVERAGE_TABLE_COLUMNS = [
   {
      id: "level",
      label: "level",
      type: CELL_TYPE_NUMBER,
      width_px: 40,
      align: CELL_ALIGN_CENTER
   },
   {
      id: "tile_count",
      label: "tile count",
      type: CELL_TYPE_NUMBER,
      width_px: 80,
      align: CELL_ALIGN_CENTER
   },
   {
      id: "can_do",
      label: "can do",
      type: CELL_TYPE_NUMBER,
      width_px: 80,
      align: CELL_ALIGN_CENTER
   },
   {
      id: "blank_tiles",
      label: "blank",
      type: CELL_TYPE_NUMBER,
      width_px: 80,
      align: CELL_ALIGN_CENTER
   },
   {
      id: "interior_tiles",
      label: "interior",
      type: CELL_TYPE_NUMBER,
      width_px: 80,
      align: CELL_ALIGN_CENTER
   },
   {
      id: "needs_update_tiles",
      label: "update?",
      type: CELL_TYPE_NUMBER,
      width_px: 80,
      align: CELL_ALIGN_CENTER
   },
]

export const GENERATOR_CODE_REDO = 'tiles_redo'
export const GENERATOR_CODE_CAN_DO = 'tiles_can_do'
export const GENERATOR_CODE_BLANK = 'tiles_blank'
export const GENERATOR_CODE_INTERIOR = 'tiles_interior'
export const GENERATOR_CODE_NEEDS_UPDATE = 'tiles_needs_update'

export class GeneratorControl extends Component {
   static propTypes = {
      coverage_data: PropTypes.array.isRequired,
      on_generate: PropTypes.func.isRequired,
   }

   state = {}

   componentDidMount() {
   }

   componentDidUpdate(prevProps, prevState, snapshot) {
   }

   generate_redo = (tiles, level) => {
      const {on_generate} = this.props
      on_generate(tiles, level, GENERATOR_CODE_REDO);
   }

   generate_can_do = (tiles, level) => {
      const {on_generate} = this.props
      on_generate(tiles, level, GENERATOR_CODE_CAN_DO);
   }

   generate_blank = (tiles, level) => {
      const {on_generate} = this.props
      on_generate(tiles, level, GENERATOR_CODE_BLANK);
   }

   generate_interior = (tiles, level) => {
      const {on_generate} = this.props
      on_generate(tiles, level, GENERATOR_CODE_INTERIOR);
   }

   generate_needs_update = (tiles, level) => {
      const {on_generate} = this.props
      on_generate(tiles, level, GENERATOR_CODE_NEEDS_UPDATE);
   }

   render() {
      const {coverage_data} = this.props
      if (!Array.isArray(coverage_data)) {
         // console.log('coverage_data is not an array', coverage_data)
         return []
      }
      const coverage_rows = coverage_data
         .filter((data, i) => {
            return (data.filtered_by_level.length
               || data.blanks_by_level.length
               || data.interiors_with_bounds.length
               || data.needs_update_with_bounds.length
               || data.tiles.length > 1)
         })
         .map(data => {
            data.can_do = data.filtered_by_level.length
               ? <LinkedCell
                  onClick={e => this.generate_can_do(data.filtered_by_level, data.level, false)}>
                  <CoolStyles.LinkSpan>{data.filtered_by_level.length}</CoolStyles.LinkSpan>
               </LinkedCell>
               : '-';
            data.blank_tiles = data.blanks_by_level.length
               ? <LinkedCell
                  onClick={e => this.generate_blank(data.blanks_by_level, data.level, false)}>
                  <CoolStyles.LinkSpan>{data.blanks_by_level.length}</CoolStyles.LinkSpan>
               </LinkedCell> : '-';
            data.interior_tiles = data.interiors_with_bounds.length
               ? <LinkedCell
                  onClick={e => this.generate_interior(data.interiors_with_bounds, data.level, true)}>
                  <CoolStyles.LinkSpan>{data.interiors_with_bounds.length}</CoolStyles.LinkSpan>
               </LinkedCell>
               : '-';
            data.needs_update_tiles = data.needs_update_with_bounds.length
               ? <LinkedCell
                  onClick={e => this.generate_needs_update(data.needs_update_with_bounds, data.level)}>
                  <CoolStyles.LinkSpan>{data.needs_update_with_bounds.length}</CoolStyles.LinkSpan>
               </LinkedCell>
               : '-';
            data.tile_count = data.tiles.length
               ? <LinkedCell
                  onClick={e => this.generate_redo(data.tiles, data.level)}>
                  <CoolStyles.LinkSpan>{data.tiles.length}</CoolStyles.LinkSpan>
               </LinkedCell>
               : '-';
            return data
         });

      return <CoolStyles.InlineBlock>
         <CoolTable
            data={coverage_rows}
            columns={COVERAGE_TABLE_COLUMNS}
         />
      </CoolStyles.InlineBlock>;
   }

}

export default GeneratorControl

