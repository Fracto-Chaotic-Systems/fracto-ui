import React, {Component} from "react";
import PropTypes from "prop-types";
import FractoRasterImage from "./FractoRasterImage.jsx";

export class FractoLegend extends Component {
   static propTypes = {
      height_px: PropTypes.string.isRequired,
      focal_point: PropTypes.object.isRequired,
   }

   on_plan_complete = (canvas_buffer, ctx) => {
      // render_cross_hairs (ctx)
   }

   render() {
      const {height_px} = this.props
      return <FractoRasterImage
         width_px={2 * height_px}
         focal_point={{x: -0.75, y: 0.55}}
         scope={2.75}
         aspect_ratio={0.5}
         on_plan_complete={this.on_plan_complete}
      />
   }
}

export default FractoLegend

