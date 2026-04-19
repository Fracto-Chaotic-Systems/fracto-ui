import React, {Component} from "react";
import PropTypes from "prop-types";
import LinearProgress from "@mui/material/LinearProgress";

import {CoolStyles} from "../../../utils/ui/CoolImports.jsx";
import {MainStyles as styles} from "../../../styles/MainStyles.jsx";
import {TILE_RENDER_WIDTH_PX} from "./GeneratorOperations.jsx";

import GeneratorContext from "./GeneratorContext.jsx";

const TITLE_TEXT_STYLE = {
   textTransform: 'uppercase',
   fontStyle: 'italic',
   fontSize: '1.0rem',
   color: '#666666',
   lineHeight: '28px',
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

   context_ready = (canvas_buffer) => {
      const {tiles, tile_index, on_context_ready} = this.props
      const tile = tiles[tile_index]
      on_context_ready(tile.short_code, canvas_buffer)
   }

   render_context = () => {
      const {tiles, tile_index} = this.props
      const tile = tiles[tile_index]
      if (tile_index < 0) {
         return []
      }
      const context_style = {
         height: `${TILE_RENDER_WIDTH_PX}px`,
         boxShadow: '5px 5px 10px rgba(0, 0, 0, 0.25)',
      }
      return <CoolStyles.Block
         key={'tile-context'}>
         <CoolStyles.InlineBlock
            style={context_style}>
            <GeneratorContext
               tile={tile}
               on_plan_complete={this.context_ready}
            />
         </CoolStyles.InlineBlock>
      </CoolStyles.Block>
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

   render_progress = () => {
      const {tiles, tile_index} = this.props
      const completed = <styles.NumericValue
         style={NUMERAL_STYLE}>
         {tile_index}
      </styles.NumericValue>
      const remaining = <styles.NumericValue
         style={NUMERAL_STYLE}>
         {tiles.length - tile_index}
      </styles.NumericValue>
      const percent = Math.round(tile_index * 1000 / tiles.length) / 100
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
      const {tiles, tile_index} = this.props
      const percent = Math.round(tile_index * 1000 / tiles.length) / 100
      return <styles.CenteredBlock>
         <LinearProgress
            variant="determinate"
            value={percent}
         />
      </styles.CenteredBlock>
   }

   render_button = () => {
      const {in_progress, on_start_pause} = this.props
      const button_style = {
         padding: `0 0.5rem 0.25rem`,
      }
      const button_text = in_progress ? 'pause' : 'start'
      return <styles.CenteredBlock>
         <styles.BlueButton
            onClick={on_start_pause}
            style={button_style}>
            {button_text}
         </styles.BlueButton>
      </styles.CenteredBlock>
   }

   render() {
      const {tile_index} = this.props
      if (tile_index < 0) {
         return []
      }
      const preamble = this.render_preamble()
      const context = this.render_context()
      const progress = this.render_progress()
      const scale = this.render_scale()
      const button = this.render_button()
      return [
         preamble,
         context,
         <styles.OneRemDown/>,
         scale,
         progress,
         button,
      ]
   }
}

export default GeneratorActions
