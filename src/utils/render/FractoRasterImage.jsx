import React, {Component} from 'react';
import PropTypes from "prop-types";
import styled from "styled-components";

import {CoolStyles} from "../ui/CoolImports";

import FractoColors from "../../../../../sdk/FractoColors";
import {
   init_canvas_buffer,
   fill_canvas_buffer,
} from "../../../../../sdk/FractoTileData.js";

const FractoCanvas = styled.canvas`
    ${CoolStyles.narrow_box_shadow}
    margin: 0;
`;

export var BAD_TILES = {};

export class FractoRasterImage extends Component {

   static propTypes = {
      width_px: PropTypes.number.isRequired,
      focal_point: PropTypes.object.isRequired,
      scope: PropTypes.number.isRequired,
      on_plan_complete: PropTypes.func,
      aspect_ratio: PropTypes.number,
      disabled: PropTypes.bool,
      update_counter: PropTypes.number,
      filter_level: PropTypes.number,
      color_handler: PropTypes.func,
      resolution_factor: PropTypes.number,
   }

   static defaultProps = {
      aspect_ratio: 1.0,
      disabled: false,
      update_counter: 0,
      filter_level: 0,
      color_handler: FractoColors.pattern_color_hsl,
      resolution_factor: 1,
   }

   state = {
      canvas_buffer: null,
      canvas_ref: React.createRef(),
      loading_tiles: true,
      stored_values: {}
   }

   componentDidMount() {
      const {canvas_ref} = this.state;
      const {width_px, aspect_ratio} = this.props;
      const canvas = canvas_ref.current;
      if (!canvas) {
         console.log('no canvas');
         return;
      }
      const ctx = canvas.getContext('2d');
      let height_px = Math.round(width_px * aspect_ratio);
      if (height_px & 1) {
         height_px -= 1
      }
      this.setState({
         height_px: height_px,
         ctx: ctx
      })

      setTimeout(() => {
         const canvas_buffer = this.init_canvas_buffer()
         this.fill_canvas_buffer(canvas_buffer, ctx)
      }, 100)
   }

   componentDidUpdate(prevProps, prevState, snapshot) {
      const width_px_changed = prevProps.width_px !== this.props.width_px;
      const aspect_ratio_changed = prevProps.aspect_ratio !== this.props.aspect_ratio;
      let canvas_buffer = this.state.canvas_buffer
      if (this.state.loading_tiles) {
         return;
      }
      if (
         width_px_changed
         || aspect_ratio_changed
         || !canvas_buffer) {
         canvas_buffer = this.init_canvas_buffer()
         this.fill_canvas_buffer(canvas_buffer, this.state.ctx);
      } else {
         const {stored_values} = this.state
         let focal_point_x_changed = false
         if (stored_values.focal_point) {
            const diff_focal_point_x = this.props.focal_point.x - stored_values.focal_point.x
            const diff_focal_point_y = this.props.focal_point.y - stored_values.focal_point.y
            const magnitude_diff = Math.sqrt(
               diff_focal_point_x * diff_focal_point_x + diff_focal_point_y * diff_focal_point_y)
            focal_point_x_changed = (magnitude_diff / this.props.scope > 0.001)
         }
         const settings_changed = PageSettings.test_update_settings(
            [
               // KEY_FOCAL_POINT,
               KEY_SCOPE,
               KEY_UPDATE_INDEX,
            ], this.props, stored_values)
         if (settings_changed || focal_point_x_changed) {
            stored_values.filter_level = this.props.filter_level
            stored_values.focal_point = this.props.focal_point
            this.setState({stored_values, loading_tiles: true})
            this.fill_canvas_buffer(canvas_buffer, this.state.ctx);
            // console.log('stored values changed', stored_values);
         }
      }
   }

   init_canvas_buffer = () => {
      const {width_px, aspect_ratio} = this.props
      let height_px = Math.round(width_px * aspect_ratio);
      if (height_px & 1) {
         height_px -= 1
      }
      const new_canvas_buffer = init_canvas_buffer(width_px, aspect_ratio);
      this.setState({
         canvas_buffer: new_canvas_buffer,
         height_px: height_px
      })
      return new_canvas_buffer
   }

   fill_canvas_buffer = async (canvas_buffer, ctx) => {
      const {
         width_px,
         focal_point,
         scope,
         aspect_ratio,
         on_plan_complete,
         resolution_factor
      } = this.props
      // console.log('fill_canvas_buffer')
      await fill_canvas_buffer(canvas_buffer, width_px, focal_point, scope, aspect_ratio, resolution_factor)
      FractoColors.buffer_to_canvas(canvas_buffer, ctx)
      if (on_plan_complete) {
         on_plan_complete(canvas_buffer, ctx)
      }
      this.setState({loading_tiles: false})
   }

   render() {
      const {canvas_ref, loading_tiles} = this.state;
      const {width_px, disabled, aspect_ratio} = this.props;
      const canvas_style = {
         cursor: loading_tiles || disabled ? "wait" : "crosshair"
      }
      return <FractoCanvas
         key={'fracto-canvas'}
         ref={canvas_ref}
         style={canvas_style}
         width={width_px}
         height={width_px * aspect_ratio}
      />
   }
}

export default FractoRasterImage
