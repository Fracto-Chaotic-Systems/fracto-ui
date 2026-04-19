import {Component} from "react";
import PropTypes from "prop-types";

import {MainStyles as styles} from '../../../styles/MainStyles.jsx'
import {KEY_TILES_OVERVIEW} from "../../../text/TilesText.jsx";
import AppText from "../../../AppText.jsx";
import FractoRasterImage from "../../../utils/render/FractoRasterImage.jsx";
import {TILE_RENDER_WIDTH_PX} from "./GeneratorOperations.jsx";

const SCOPE_FACTOR = 5

export class GeneatorContext extends Component {
   static propTypes = {
      tile: PropTypes.string.isRequired,
   }

   on_plan_complete = (canvas_buffer, ctx) => {
      const tile_width_by_scope_factor
         = (TILE_RENDER_WIDTH_PX) / SCOPE_FACTOR
      const margin 
         = TILE_RENDER_WIDTH_PX * (SCOPE_FACTOR - 1) / (2 * SCOPE_FACTOR)

      // Clear and set styles
      ctx.setLineDash([6, 3]); // [dash length, gap length]
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(margin, margin, tile_width_by_scope_factor, tile_width_by_scope_factor);

      ctx.setLineDash([6, 3]); // [dash length, gap length]
      ctx.strokeStyle = '#444444';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(margin+2, margin+2, tile_width_by_scope_factor, tile_width_by_scope_factor);
   }

   render() {
      const {tile} = this.props
      const tile_width_by_two = (tile.bounds.right - tile.bounds.left) / 2
      const focal_point = {
         x: tile.bounds.left + tile_width_by_two,
         y: tile.bounds.top - tile_width_by_two,
      }
      return <FractoRasterImage
         width_px={TILE_RENDER_WIDTH_PX}
         focal_point={focal_point}
         scope={tile_width_by_two * SCOPE_FACTOR}
         on_plan_complete={this.on_plan_complete}
      />
   }
}

export default GeneatorContext
