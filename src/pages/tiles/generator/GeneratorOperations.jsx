import React, {Component} from "react";
import PropTypes from "prop-types";

import {MainStyles as styles, MARGIN_PX} from '../../../styles/MainStyles.jsx'
import {bounds_from_short_code} from "../TilesUtils.jsx";
import FractoFastCalc from "../../../../../../sdk/FractoFastCalc.js";
import GeneratorContext from "./GeneratorContext.jsx";
import GeneratorActions from "./GeneratorActions.jsx";

export const TILE_RENDER_WIDTH_PX = 300
const ACTIONS_WIDTH_PX = 2 * TILE_RENDER_WIDTH_PX + 3 * MARGIN_PX

export class GeneratorOperations extends Component {
   static propTypes = {
      short_codes: PropTypes.array.isRequired,
   }

   state = {
      tile_index: -1,
      tiles: [],
   }

   componentDidMount() {
      this.prepare_short_codes()
   }

   componentDidUpdate(prevProps, prevState, snapshot) {
      const short_codes_changed =
         this.props.short_codes.length
         !== prevProps.short_codes.length;
      if (short_codes_changed) {
         this.prepare_short_codes()
      }
   }

   prepare_short_codes = () => {
      const {short_codes} = this.props
      const tiles = short_codes.map((short_code, i) => {
         return {
            short_code,
            bounds: bounds_from_short_code(short_code),
         }
      }).sort((a, b) => {
         return a.bounds.left === b.bounds.left ?
            (a.bounds.top > b.bounds.top ? -1 : 1) :
            (a.bounds.left > b.bounds.left ? 1 : -1)
      })
      const tile_index = tiles.length ? 0 : -1
      this.setState({tiles, tile_index})
   }

   new_tile = () => {
      const tile = new Array(256)
         .fill(0)
         .map(() => new Array(256)
            .fill([0, 0]));
      for (let img_x = 0; img_x < 256; img_x++) {
         for (let img_y = 0; img_y < 256; img_y++) {
            tile[img_x][img_y] = [0, 0]
         }
      }
      return tile
   }

   calculate_tile = (tile) => {
      console.log("calculate_tile", tile)
      const short_code = tile.short_code
      const level = short_code.length
      const tile_points = this.new_tile()
      const increment = (tile.bounds.right - tile.bounds.left) / 256.0;
      for (let img_x = 0; img_x < 256; img_x++) {
         const x = tile.bounds.left + img_x * increment;
         for (let img_y = 0; img_y < 256; img_y++) {
            const y = tile.bounds.top - img_y * increment;
            const values = FractoFastCalc.calc(x, y, level)
            tile_points[img_x][img_y] = [values.pattern, values.iteration];
         }
      }
      return tile_points;
   }

   actions_block = () => {
      const {tile_index, tiles} = this.state
      const context = tile_index >= 0
         ? <GeneratorActions
            tile={tiles[tile_index]}
            tile_index={tile_index}
         />
         : []
      const block_style = {
         width: `${ACTIONS_WIDTH_PX}px`,
         backgroundColor: 'lightgreen',
         padding: `${MARGIN_PX}px`,
      }
      return <styles.FixedInlineBlock
         style={block_style}>
         {context}
      </styles.FixedInlineBlock>
   }

   history_block = () => {
      const {tile_index, tiles} = this.state
      const history = tile_index >= 0
         ? []
         : []
      return history
   }

   render() {
      // console.log('GeneratorOperations', tile_index)
      const actions_block = this.actions_block()
      const history_block = this.history_block()
      return <styles.FixedInlineBlock>
         {actions_block}
         {history_block}
      </styles.FixedInlineBlock>
   }
}

export default GeneratorOperations
