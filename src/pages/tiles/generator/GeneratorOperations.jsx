import React, {Component} from "react";
import PropTypes from "prop-types";

import {MARGIN_PX} from '../../../styles/MainStyles.jsx'
import CoolStyles from '../../../utils/ui/styles/CoolStyles.jsx'
import {copy_json} from "../../../utils/Dom.jsx";

import {generate_tile_points} from "./GeneratorInterface.jsx";
import {bounds_from_short_code} from "../TilesUtils.jsx";
import GeneratorActions from "./GeneratorActions.jsx";
import GeneratorHistory from "./GeneratorHistory.jsx";

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

   on_context_ready = (short_code, context_buffer) => {
      const {tile_index, tiles, in_progress, history} = this.state
      // console.log(`context_ready: ${short_code}`)
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
         const {generate_code} = this.props
         const record = generate_tile_points(tile, generate_code, context_buffer)
         this.setState({tile_points: copy_json(record.tile_points)})

         delete record.tile_points
         record.tile_index = this.state.tile_index
         history.push(copy_json(record))
         this.setState({history})

         if (tile_index === tiles.length - 1) {
            this.setState({
               in_progress: false,
               tile_index: tiles.length,
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
      return <CoolStyles.Block style={{height: `40rem`}}>
         {actions_block}
         {history_block}
      </CoolStyles.Block>
   }
}

export default GeneratorOperations
