import React, {Component} from "react";
import PropTypes from "prop-types";

import {
   FRACTO_TILES_PORT,
   FRACTO_UI_PORT
} from "../../../../../constants.js";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppSettings from "../../AppSettings.jsx";
import {KEY_NAVIGATOR_DISABLED} from "../../settings/NavigatorSettings.jsx";

import FractoColors from "./FractoColors.jsx";

export class FractoHeatMap extends Component {
   static propTypes = {
      frame_settings: PropTypes.object.isRequired,
      frame_settings_key: PropTypes.string.isRequired,
   }

   state = {
      canvas_ref: React.createRef(),
      subscription: null,
   }

   componentDidMount() {
      const {canvas_ref} = this.state;
      const {frame_settings, frame_settings_key} = this.props;
      const canvas = canvas_ref.current;
      let ctx = null
      if (canvas) {
         ctx = canvas.getContext('2d');
         ctx.fillStyle = 'white';
         ctx.fillRect(0, 0, frame_settings.width_px, frame_settings.width_px);
      } else {
         console.log('FractoHeatMap no canvas');
      }
      this.setState({
         ctx,
         subscription: AppSettings
            .subscribe(frame_settings_key, this.on_frame_settings_changed)
      })
   }

   componentWillUnmount() {
      const {subscription} = this.state
      if (subscription) {
         AppSettings.unsubscribe(subscription)
      }
   }

   on_frame_settings_changed = (key, value) => {
      const {ctx} = this.state
      const {frame_settings} = this.props
      if (ctx) {
         ctx.fillStyle = 'white';
         ctx.fillRect(0, 0, frame_settings.width_px, frame_settings.width_px);
      }
   }

   generate_heat_map = async () => {
      const {ctx} = this.state
      const {frame_settings} = this.props
      const disabled = AppSettings.get(KEY_NAVIGATOR_DISABLED)
      if (disabled || !frame_settings) {
         return;
      }
      const all_params = [
         `width_px=${frame_settings?.width_px}`,
         `focal_point_x=${frame_settings.focal_point.x}`,
         `focal_point_y=${frame_settings.focal_point.y}`,
         `scope=${frame_settings.scope}`,
         `aspect_ratio=${1}`,
      ].join('&')
      const origin = window.origin.replace(`${FRACTO_UI_PORT}`, `${FRACTO_TILES_PORT}`)
      const url = `${origin}/heat_map_buffer?${all_params}`
      try {
         console.log('fetching heat map', url)
         const result = await fetch(url, {}).then(res => res.json())
         FractoColors.buffer_to_canvas(result.heat_map_buffer, ctx)
         console.log('new heat map', result)
         this.setState({heat_map_buffer: result.heat_map_buffer})
      } catch (e) {
         console.error(`error fetching ${url}`)
      }
   }

   render() {
      const {canvas_ref} = this.state
      const {frame_settings} = this.props
      const right_block_style = {
         height: `${frame_settings.width_px}px`,
         width: `${frame_settings.width_px}px`,
         cursor: 'pointer',
         border: '1px solid #666666',
         borderRadius: '0.25rem',
      }
      return <styles.FixedInlineBlock
         title={'click for heat map'}
         style={right_block_style}
         onClick={this.generate_heat_map}>
         <canvas
            ref={canvas_ref}
            width={frame_settings.width_px}
            height={frame_settings.width_px}
         />
      </styles.FixedInlineBlock>
   }
}

export default FractoHeatMap
