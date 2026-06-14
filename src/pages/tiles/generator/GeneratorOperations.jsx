import React, {Component} from "react";
import PropTypes, {bool} from "prop-types";

import {MainStyles as styles, MARGIN_PX} from '../../../styles/MainStyles.jsx'
import CoolStyles from '../../../utils/ui/styles/CoolStyles.jsx'

import {bounds_from_short_code} from "../TilesUtils.jsx";
import FractoFastCalc from "../../../../../../sdk/FractoFastCalc.js";
import GeneratorActions from "./GeneratorActions.jsx";
import GeneratorHistory from "./GeneratorHistory.jsx";
import {KEY_TILES_GENERATOR_SPLITTER_POS} from "../../../settings/TilesSettings.jsx";
import AppSettings from "../../../AppSettings.jsx";

export const TILE_RENDER_WIDTH_PX = 300
const ACTIONS_WIDTH_PX = 2 * TILE_RENDER_WIDTH_PX + 3 * MARGIN_PX

const NEXT_TILE_DELAY_MS = 150

export class GeneratorOperations extends Component {
   static propTypes = {
      short_codes: PropTypes.array.isRequired,
      generate_code: PropTypes.string.isRequired,
   }

   state = {
      tile_index: -1,
      tiles: [],
      in_progress: false,
      ready_short_code: null,
      tile_points: null,
      resume_index: 0,
      history: []
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
      this.setState({tiles, tile_index, history: []})
   }

   static tile_points = null

   new_tile = () => {
      if (GeneratorOperations.tile_points) {
         return GeneratorOperations.tile_points
      }
      GeneratorOperations.tile_points = new Array(256)
         .fill(0)
         .map(() => new Array(256)
            .fill([0, 0]));
      for (let img_x = 0; img_x < 256; img_x++) {
         for (let img_y = 0; img_y < 256; img_y++) {
            GeneratorOperations.tile_points[img_x][img_y] = [0, 0]
         }
      }
      return GeneratorOperations.tile_points
   }

   calculate_tile = (tile, tile_points) => {
      console.log("calculate_tile", tile)
      const short_code = tile.short_code
      const level = short_code.length
      const increment = (tile.bounds.right - tile.bounds.left) / 256.0;
      let estimated = 0
      try {
         for (let img_x = 0; img_x < 256; img_x++) {
            const x = tile.bounds.left + img_x * increment;
            for (let img_y = 0; img_y < 256; img_y++) {
               const y = tile.bounds.top - img_y * increment;
               const values = FractoFastCalc.calc(x, y, level)
               tile_points[img_x][img_y][0] = values.pattern;
               tile_points[img_x][img_y][1] = values.iteration;
               if (values.estimated) {
                  estimated++
               }
            }
         }
         if (estimated) {
            console.log(`tile ${tile.short_code} has ${estimated} estimated point(s)`)
         }
         return tile_points;
      } catch (e) {
         console.error(e)
         debugger;
         return tile_points;
      }
   }

   on_start_pause = () => {
      const {in_progress, tile_index} = this.state
      const new_state = !in_progress
      this.setState({
         in_progress: new_state,
         resume_index: tile_index,
      })
      // console.log('on_start_pause', this.state)
      if (new_state) {
         this.setState({tile_index: -1})
         setTimeout(() => {
            this.setState({
               tile_index: this.state.resume_index
            })
         }, 100)
      }
   }

   test_interior = (context_buffer) => {
      for (let col = 0; col < context_buffer.length; col++) {
         for (let row = 0; row < context_buffer[col].length; row++) {
            const pattern = context_buffer[col][row][0]
            if (pattern === 0) {
               return false
            }
         }
      }
      return true
   }

   test_blank = (tile_points) => {
      const first_iteration = tile_points[0][0][1]
      for (let col = 0; col < tile_points.length; col++) {
         for (let row = 0; row < tile_points[col].length; row++) {
            const pattern = tile_points[col][row][0]
            if (pattern > 0) {
               return false
            }
            const iteration = tile_points[col][row][1]
            if (first_iteration !== iteration) {
               return false
            }
         }
      }
      return true
   }

   on_context_ready = (short_code, context_buffer) => {
      const {tile_index, tiles, in_progress, history} = this.state
      // console.log(`context_ready: ${short_code}`)
      const is_interior = this.test_interior(context_buffer)
      if (!in_progress) {
         return
      }
      if (tile_index >= tiles.length) {
         this.setState({
            in_progress: false,
            tile_index: tiles.length,
         })
         return;
      }
      const tile = tiles[tile_index]
      if (tile.short_code !== short_code) {
         console.error(`tile.short_code mismatch ${short_code}`, tile)
         return
      }
      setTimeout(() => {
         const tile_points = this.new_tile()
         const start = performance.now()
         this.calculate_tile(tile, tile_points)
         const is_blank = this.test_blank(tile_points)
         const end = performance.now()
         const record = {
            tile,
            is_interior,
            is_blank,
            duration: end - start,
            timestamp: Date.now(),
            tile_index: this.state.tile_index,
         }
         history.push(record)
         this.setState({tile_points, history})
         if (tile_index === tiles.length - 1) {
            this.setState({
               in_progress: false,
               tile_index: tiles.length,
               // resume_index: 0,
            })
         } else {
            this.setState({tile_index: tile_index + 1});
         }
      }, NEXT_TILE_DELAY_MS)
   }

   actions_block = () => {
      const {tile_index, tiles, in_progress, tile_points} = this.state
      const actions = <GeneratorActions
         tiles={tiles}
         tile_index={tile_index}
         tile_points={tile_points}
         in_progress={in_progress}
         on_start_pause={this.on_start_pause}
         on_context_ready={this.on_context_ready}
      />
      const block_style = {
         width: `${ACTIONS_WIDTH_PX}px`,
         padding: `${MARGIN_PX}px`,
      }
      return <CoolStyles.Block
         style={block_style}>
         {actions}
      </CoolStyles.Block>
   }

   history_block = (history) => {
      const {tile_index} = this.state
      const {generate_code, short_codes} = this.props
      const splitter_pos = AppSettings.get(KEY_TILES_GENERATOR_SPLITTER_POS)
      const block_style = {
         paddingLeft: `1rem`,
      }
      return <CoolStyles.Block
         style={block_style}>
         <GeneratorHistory
            all_records={history}
            tile_index={tile_index}
            generate_code={generate_code}
            tile_count={short_codes.length}
         />
      </CoolStyles.Block>
   }

   render() {
      const {history} = this.state
      const actions_block = this.actions_block()
      const history_block = this.history_block(history)
      return <CoolStyles.Block style={{height: 'fit-content'}}>
         {actions_block}
         {history_block}
      </CoolStyles.Block>
   }
}

export default GeneratorOperations
