import React, {Component} from "react";
import PropTypes from "prop-types";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {color_wheel} from "./ColorWheelUtils.jsx";
import {collect_orbitals} from "../../pages/study/fields/CanvasBufferUtils.jsx";

export class FieldsColorWheel extends Component {
   static propTypes = {
      width_px: PropTypes.number.isRequired,
      canvas_buffer: PropTypes.object.isRequired,
   }

   state = {
      canvas_ref: React.createRef(),
   }

   componentDidMount() {
      this.fill_pattern_bins()
   }

   componentDidUpdate(prevProps, prevState, snapshot) {
      const current_canvas_buffer = JSON.stringify(this.props.canvas_buffer);
      const prev_canvas_buffer = JSON.stringify(prevProps.canvas_buffer);
      if (prev_canvas_buffer !== current_canvas_buffer) {
         this.fill_pattern_bins()
      }
   }

   fill_pattern_bins = () => {
      const {canvas_ref} = this.state
      const {canvas_buffer, width_px} = this.props
      console.log('fill_pattern_bins')
      const orbital_bins = collect_orbitals(canvas_buffer)
      const radius = width_px / 2 - 10
      if (radius > 0) {
         color_wheel(canvas_ref, radius, 9, 0, orbital_bins)
      }
      return true
   }

   render() {
      const {canvas_ref} = this.state
      const {width_px} = this.props
      const wheelStyle = {
         height: `${width_px}px`, width: `${width_px}px`
      }
      return <styles.ColorWheelWrapper
         style={wheelStyle}>
         <styles.ColorWheelCanvas
            ref={canvas_ref}
            width={width_px}
            height={width_px}
         />
      </styles.ColorWheelWrapper>
   }
}

export default FieldsColorWheel
