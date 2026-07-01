import React, {Component} from "react";
import PropTypes from "prop-types";

import {CoolStyles} from "../../../utils/ui/CoolImports.jsx";
import {MainStyles as styles} from "../../../styles/MainStyles.jsx";

import {render_coordinates} from "../../../utils/Dom.jsx";
import {TILE_RENDER_WIDTH_PX} from "./GeneratorOperations.jsx";
import GeneratorContext from "./GeneratorContext.jsx";
import GeneratorTile from "./GeneratorTile.jsx";

export class GeneratorActiveState extends Component {
   static propTypes = {
      tiles: PropTypes.array.isRequired,
      tile_index: PropTypes.number.isRequired,
      tile_points: PropTypes.array.isRequired,
      on_context_ready: PropTypes.func.isRequired,
      canvas_buffer: PropTypes.array.isRequired,
   }

   context_ready = (context_buffer) => {
      const {tiles, tile_index, on_context_ready} = this.props
      const tile = tiles[tile_index]
      on_context_ready(tile.short_code, context_buffer)
   }

   render_context = () => {
      const {tiles, tile_index} = this.props
      const tile = tile_index === tiles.length
         ? tiles[tile_index - 1]
         : tiles[tile_index]
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

   render_generated = (tile_points) => {
      const {tiles, tile_index} = this.props
      const tile = tile_index === tiles.length
         ? tiles[tile_index - 1]
         : tiles[tile_index]
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
      const {canvas_buffer, tile_points} = this.props
      const context = this.render_context(canvas_buffer)
      const generated = this.render_generated(tile_points)
      return <styles.CenteredBlock key={'active-state'}>
         {context}
         <styles.OneRemSpacer/>
         {generated}
      </styles.CenteredBlock>
   }
}

export default GeneratorActiveState
