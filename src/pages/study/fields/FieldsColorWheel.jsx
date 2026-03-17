import React, {Component} from "react";
import PropTypes from "prop-types";

import {PaneCompsStyles as styles} from 'styles/PaneCompsStyles'
import PageSettings from "pages/PageSettings";
import {KEY_COMPS_HEIGHT_PX} from "pages/settings/PaneSettings";
import {
   KEY_UPDATE_INDEX,
   KEY_SCOPE,
} from "pages/settings/AppSettings";
import {collect_orbitals} from "fracto/CanvasBufferUtils";
import {color_wheel} from "fracto/ColorWheelUtils";

export class FieldsColorWheel extends Component {
   static propTypes = {
      page_settings: PropTypes.object.isRequired,
      on_settings_changed: PropTypes.func.isRequired,
   }

   state = {
      canvas_ref: React.createRef(),
      dimension_px: 0,
      stored_values: {},
      interval: null,
   }

   componentDidMount() {
      const {stored_values} = this.state
      const {page_settings} = this.props
      this.fill_pattern_bins()
      const interval = setInterval(() => {
         const settings_changed = PageSettings.test_update_settings(
            [KEY_UPDATE_INDEX, KEY_SCOPE], page_settings, stored_values)
         if (settings_changed) {
            this.setState({stored_values})
            this.fill_pattern_bins()
         }
      }, 500)
      this.setState({interval})
   }

   componentWillUnmount() {
      const {interval} = this.state
      if (interval) {
         clearInterval(interval)
      }
   }

   fill_pattern_bins = () => {
      const {canvas_ref} = this.state
      const {page_settings} = this.props
      const {canvas_buffer} = page_settings
      console.log('fill_pattern_bins')
      if (!canvas_buffer) {
         return false;
      }
      const dimension_px = page_settings[KEY_COMPS_HEIGHT_PX] * 0.45
      const orbital_bins = collect_orbitals(canvas_buffer)
      setTimeout(() => {
         this.setState({dimension_px})
      }, 100)
      const radius = dimension_px / 2 - 10
      if (radius > 0) {
         color_wheel(canvas_ref, radius, 8, 0, orbital_bins)
      }
      return true
   }

   render() {
      const {canvas_ref, dimension_px} = this.state
      const wheelStyle = {
         height: `${dimension_px}px`, width: `${dimension_px}px`
      }
      return <styles.ColorWheelWrapper style={wheelStyle}>
         <styles.ColorWheelCanvas
            ref={canvas_ref}
            width={dimension_px}
            height={dimension_px}
         />
      </styles.ColorWheelWrapper>
   }
}

export default FieldsColorWheel
