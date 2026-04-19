import React, {Component} from "react";
import PropTypes from "prop-types";

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
   }

   state = {
      ready_short_code: null,
   }

   context_ready = () => {
      const {tiles, tile_index} = this.props
      const tile = tiles[tile_index]
      this.setState({
         ready_short_code: tile.short_code
      });
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
      return <CoolStyles.Block>
         <CoolStyles.InlineBlock
            style={context_style}>
            <GeneratorContext
               tile={tile}
               key={tile_index}
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

   render() {
      const {tile_index} = this.props
      if (tile_index < 0) {
         return []
      }
      const preamble = this.render_preamble()
      const context = this.render_context()
      const progress = this.render_progress()
      return [
         preamble,
         context,
         progress,
      ]
   }
}

export default GeneratorActions
