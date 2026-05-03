import React, {Component} from "react";
import PropTypes from "prop-types";
import LinearProgress from "@mui/material/LinearProgress";

import {CoolStyles} from "../../../utils/ui/CoolImports.jsx";
import {MainStyles as styles} from "../../../styles/MainStyles.jsx";
import {TILE_RENDER_WIDTH_PX} from "./GeneratorOperations.jsx";

import GeneratorContext from "./GeneratorContext.jsx";
import GeneratorTile from "./GeneratorTile.jsx";
import {render_coordinates} from "../../../utils/Dom.jsx";

const TITLE_TEXT_STYLE = {
   textTransform: 'uppercase',
   fontStyle: 'italic',
   fontSize: '1.0rem',
   color: '#666666',
   lineHeight: '28px',
   margin: '0 auto',
}
const NUMERAL_STYLE = {
   fontSize: '1.25rem',
   fontStyle: 'normal',
   color: '#444444',
   lineHeight: '32px',
}

export class GeneratorActions extends Component {
   static propTypes = {
      tiles: PropTypes.array.isRequired,
      tile_index: PropTypes.number.isRequired,
      tile_points: PropTypes.array.isRequired,
      in_progress: PropTypes.bool.isRequired,
      on_start_pause: PropTypes.func.isRequired,
      on_context_ready: PropTypes.func.isRequired,
      canvas_buffer: PropTypes.array,
   }

   static defaultProps = {
      canvas_buffer: null,
   }

   state = {
      ready_short_code: null,
   }

   context_ready = (context_buffer) => {
      const {tiles, tile_index, on_context_ready} = this.props
      const tile = tiles[tile_index]
      on_context_ready(tile.short_code, context_buffer)
   }

   render_context = () => {
      const {tiles, tile_index} = this.props
      const tile = tiles[tile_index]
      const context_style = {
         height: `${TILE_RENDER_WIDTH_PX}px`,
         boxShadow: '5px 5px 10px rgba(0, 0, 0, 0.25)',
      }
      const tile_center = {
         x: (tile.bounds.left + tile.bounds.right) / 2,
         y: (tile.bounds.bottom + tile.bounds.top) / 2,
      }
      const coords_style = {
         margin: '-8px auto',
         width: 'min-content',
      }
      return <CoolStyles.InlineBlock
         key={'tile-context'}
         style={context_style}>
         <div>
            <GeneratorContext
               tile={tile}
               on_plan_complete={this.context_ready}
            />
         </div>
         <div style={coords_style}>
            {render_coordinates(tile_center)}
         </div>
      </CoolStyles.InlineBlock>
   }

   render_preamble = () => {
      const {tiles, tile_index} = this.props
      const level = <styles.NumericValue
         style={NUMERAL_STYLE}>
         {tiles[tile_index].short_code.length}
      </styles.NumericValue>
      const count = <styles.NumericValue
         style={NUMERAL_STYLE}>
         {tiles.length}
      </styles.NumericValue>
      const message = [
         `Generating `,
         count,
         ` tiles of level `,
         level,
      ]
      return <styles.CenteredBlock
         style={TITLE_TEXT_STYLE}>
         {message}
      </styles.CenteredBlock>
   }

   render_progress = (canvas_buffer) => {
      const {tiles, tile_index} = this.props
      if (tile_index < 0) {
         return []
      }
      const completed = <styles.NumericValue
         style={NUMERAL_STYLE}>
         {tile_index}
      </styles.NumericValue>
      const remaining = <styles.NumericValue
         style={NUMERAL_STYLE}>
         {tiles.length - tile_index}
      </styles.NumericValue>
      const percent = Math.round(tile_index * 10000 / tiles.length) / 100
      const progress = [
         completed,
         ` completed (${percent}%), `,
         remaining,
         ` remain`
      ]
      return <styles.CenteredBlock
         style={TITLE_TEXT_STYLE}>
         {progress}
      </styles.CenteredBlock>
   }

   render_scale = () => {
      const {tiles, tile_index, canvas_buffer} = this.props
      if (tile_index < 0) {
         return []
      }
      const percent = Math.round(tile_index * 10000 / tiles.length) / 100
      const scale_style = {
         paddingTop: '10px',
         width: `${1.85 * TILE_RENDER_WIDTH_PX}px`,
         margin: '0 auto',
      }
      return <div
         style={scale_style}>
         <LinearProgress
            variant="determinate"
            value={percent}
            sx={{height: '8px'}}
         />
      </div>
   }

   render_button = () => {
      const {in_progress, on_start_pause} = this.props
      const button_style = {
         padding: `0 0.5rem 0.25rem`,
      }
      const button_text = in_progress ? 'pause' : 'start'
      return <styles.BlueButton
         onClick={on_start_pause}
         style={button_style}>
         {button_text}
      </styles.BlueButton>
   }

   render_generated = (tile_points) => {
      const {tiles, tile_index} = this.props
      const tile = tiles[tile_index]
      if (tile_index < 0) {
         return []
      }
      const generated_style = {
         height: `${TILE_RENDER_WIDTH_PX}px`,
         boxShadow: '5px 5px 10px rgba(0, 0, 0, 0.25)',
      }
      const short_code_style = {
         margin: '-8px auto',
         width: 'min-content',
      }
      return <CoolStyles.InlineBlock
         key={'tile-generated'}
         style={generated_style}>
         <div>
            <GeneratorTile
               width_px={TILE_RENDER_WIDTH_PX}
               short_code={tile.short_code}
               canvas_buffer={tile_points}
            />
         </div>
         <div style={short_code_style}>
            {tile.short_code}
         </div>
      </CoolStyles.InlineBlock>
   }

   render() {
      const {tile_index, canvas_buffer, tile_points} = this.props
      if (tile_index < 0) {
         return []
      }
      const preamble = this.render_preamble()
      const context = this.render_context(canvas_buffer)
      const progress = this.render_progress(canvas_buffer)
      const scale = this.render_scale()
      const button = this.render_button()
      const generated = this.render_generated(tile_points)
      return [
         preamble,
         <styles.CenteredBlock>
            {context}
            <styles.OneRemSpacer/>
            {generated}
         </styles.CenteredBlock>,
         <styles.OneRemDown/>,
         <styles.CenteredBlock>
            {scale}
            {progress}
            {button}
         </styles.CenteredBlock>,
      ]
   }
}

export default GeneratorActions
