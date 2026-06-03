import React, {Component} from 'react';
import PropTypes from "prop-types";

import {copy_json} from "../Dom.jsx";
import AppSettings from "../../AppSettings.jsx";
import {KEY_NAVIGATOR_DISABLED} from "../../settings/NavigatorSettings.jsx";
import FractoColors from "./FractoColors";
import {
   FRACTO_TILES_PORT,
   FRACTO_UI_PORT
} from "../../../../../constants.js";

const IP_ADDRESS = window.location.host.replace(`:${FRACTO_UI_PORT}`, '')
console.log(`Server IP Address: ${IP_ADDRESS}`);

export const fill_canvas = async (
   ctx,
   width_px,
   focal_point,
   scope,
   aspect_ratio,
   on_plan_complete,
   resolution_factor,
   opacity = 1.0,
   data_endpoint = 'canvas_buffer') => {
   // console.log('fill_canvas', {
   //    ctx,
   //    width_px,
   //    focal_point,
   //    scope,
   //    aspect_ratio,
   //    on_plan_complete,
   //    resolution_factor,
   //    opacity})
   AppSettings.on_settings_changed({
      [KEY_NAVIGATOR_DISABLED]: true
   })
   const all_params = [
      `width_px=${width_px}`,
      `focal_point_x=${focal_point.x}`,
      `focal_point_y=${focal_point.y}`,
      `scope=${scope}`,
      `aspect_ratio=${aspect_ratio}`,
      `resolution_factor=${resolution_factor}`,
   ].join('&')
   const url = `http://${IP_ADDRESS}:${FRACTO_TILES_PORT}/${data_endpoint}?${all_params}`
   try {
      console.log('fetch', url)
      const response = await fetch(url)
      const result = await response.json()
      FractoColors.buffer_to_canvas(result.canvas_buffer, ctx, 1, opacity)
      if (on_plan_complete) {
         on_plan_complete(result.canvas_buffer, ctx)
      }
      AppSettings.on_settings_changed({
         [KEY_NAVIGATOR_DISABLED]: false
      })
   } catch (e) {
      console.error('exception thrown in fill_canvas', url, e)
      AppSettings.on_settings_changed({
         [KEY_NAVIGATOR_DISABLED]: false
      })
   }
}

export class FractoRasterImage extends Component {

   static propTypes = {
      width_px: PropTypes.number.isRequired,
      focal_point: PropTypes.object.isRequired,
      scope: PropTypes.number.isRequired,
      on_plan_complete: PropTypes.func,
      aspect_ratio: PropTypes.number,
      disabled: PropTypes.bool,
      color_handler: PropTypes.func,
      resolution_factor: PropTypes.number,
      data_endpoint: PropTypes.string
   }

   static defaultProps = {
      aspect_ratio: 1.0,
      disabled: false,
      color_handler: FractoColors.pattern_color_hsl,
      resolution_factor: 1.5,
      data_endpoint: 'canvas_buffer',
   }

   state = {
      canvas_buffer: null,
      canvas_ref: React.createRef(),
      loading_tiles: true,
      stored_values: {},
   }

   componentDidMount() {
      const {canvas_ref} = this.state;
      const {width_px, aspect_ratio, scope, focal_point} = this.props;
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
         ctx: ctx,
         stored_values: {
            width_px,
            scope,
            focal_point: copy_json(focal_point)
         },
      })

      setTimeout(() => {
         this.fill_canvas(ctx)
      }, 100)
   }

   componentDidUpdate(prevProps, prevState, snapshot) {
      if (this.state.loading_tiles) {
         return;
      }
      if (!prevState.stored_values.focal_point) {
         return;
      }
      if (!prevState.stored_values.scope) {
         return;
      }
      const focal_x_changed = prevState.stored_values.focal_point.x !== this.props.focal_point.x
      const focal_y_changed = prevState.stored_values.focal_point.y !== this.props.focal_point.y
      const scope_changed = prevState.stored_values.scope !== this.props.scope
      const width_px_changed = prevState.stored_values.width_px !== this.props.width_px
      if (focal_x_changed || focal_y_changed || scope_changed || width_px_changed) {
         this.setState({
            stored_values: {
               width_px: this.props.width_px,
               scope: this.props.scope,
               focal_point: copy_json(this.props.focal_point)
            },
         })
         this.fill_canvas(this.state.ctx)
      }
   }

   fill_canvas = async (ctx) => {
      const {
         width_px,
         focal_point,
         scope,
         aspect_ratio,
         on_plan_complete,
         resolution_factor,
         data_endpoint,
      } = this.props
      this.setState({loading_tiles: true})
      try {
         await fill_canvas(
            ctx,
            width_px,
            focal_point,
            scope,
            aspect_ratio,
            on_plan_complete,
            resolution_factor,
            1.0,
            data_endpoint)
      } catch (error) {
         console.error('fill_canvas error', error)
      }
      this.setState({loading_tiles: false})
   }

   render() {
      const {canvas_ref, loading_tiles} = this.state;
      const {width_px, disabled, aspect_ratio} = this.props;
      const canvas_style = {
         cursor: loading_tiles || disabled ? "wait" : "crosshair"
      }
      return <canvas
         key={'fracto-canvas'}
         ref={canvas_ref}
         style={canvas_style}
         width={width_px}
         height={width_px * aspect_ratio}
      />
   }
}

export default FractoRasterImage
