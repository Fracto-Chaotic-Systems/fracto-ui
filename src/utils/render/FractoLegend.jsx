import React, {Component} from "react";
import PropTypes from "prop-types";
import FractoRasterImage from "./FractoRasterImage.jsx";

const LEGEND_FOCAL_POINT = {x: -0.75, y: 0.55};
const LEGEND_SCOPE = 2.75;
const LEGEND_ASPECT_RATIO = 0.5;
const BOX_WIDTH_PX = 9
const BOX_WIDTH_BY_TWO_PX = 4

export class FractoLegend extends Component {
   static propTypes = {
      height_px: PropTypes.string.isRequired,
      focal_point: PropTypes.object.isRequired,
   }

   on_plan_complete = (canvas_buffer, ctx) => {
      const {height_px, focal_point} = this.props
      const width_px = height_px / LEGEND_ASPECT_RATIO
      const half_box_width = BOX_WIDTH_PX / 2
      const half_width = width_px / 2
      const half_height = height_px / 2

      ctx.strokeStyle = 'white'
      ctx.lineWidth = 1
      ctx.strokeRect(
         half_width - half_box_width,
         half_height - half_box_width,
         BOX_WIDTH_PX,
         BOX_WIDTH_PX);
      const all_lines = [
         {
            start: {x: half_width, y: half_height - half_box_width},
            end: {x: half_width, y: 0}
         },
         {
            start: {x: half_width + half_box_width, y: half_height},
            end: {x: width_px, y: half_height}
         },
         {
            start: {x: half_width, y: half_height + half_box_width},
            end: {x: half_width, y: height_px}
         },
         {
            start: {x: half_width - half_box_width, y: half_height},
            end: {x: 0, y: half_height}
         },
      ]
      all_lines.forEach((line, i) => {
         ctx.beginPath();
         ctx.moveTo(line.start.x, line.start.y);
         ctx.lineTo(line.end.x, line.end.y)
         ctx.stroke();
      })

      ctx.beginPath();
      ctx.moveTo(half_width, half_height - half_box_width);
      ctx.lineTo(half_width, 0)
      ctx.stroke();
   }

   render() {
      const {height_px, focal_point} = this.props
      return <FractoRasterImage
         width_px={height_px / LEGEND_ASPECT_RATIO}
         focal_point={focal_point}
         scope={LEGEND_SCOPE}
         aspect_ratio={LEGEND_ASPECT_RATIO}
         on_plan_complete={this.on_plan_complete}
      />
   }
}

export default FractoLegend

