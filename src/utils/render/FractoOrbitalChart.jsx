import React, {Component} from 'react';
import PropTypes from "prop-types";
import {click_point_chart} from "./PatternsUtils.jsx";
import FractoFastCalc from "../../../../../sdk/FractoFastCalc.js";

export class FractoOrbitalChart extends Component {
   static propTypes = {
      width_px: PropTypes.number.isRequired,
      focal_point: PropTypes.object.isRequired,
   }

   state = {
      fracto_values: null,
      Q_core_neg: null,
   }

   componentDidMount() {
      this.update_data()
   }

   componentDidUpdate(prevProps, prevState, snapshot) {
      const focal_x_changed = prevProps.focal_point.x !== this.props.focal_point.x
      const focal_y_changed = prevProps.focal_point.y !== this.props.focal_point.y
      if (focal_y_changed || focal_x_changed) {
         this.update_data()
      }
   }

   update_data = () => {
      const {focal_point} = this.props
      const {x, y} = focal_point
      const fracto_values = FractoFastCalc.calc(x, y)
      const Q_core_neg = FractoFastCalc.calculate_cardioid_Q(x, y, -1)
      this.setState({fracto_values, Q_core_neg})
   }

   render() {
      const {fracto_values, Q_core_neg} = this.state
      if (!fracto_values || !Q_core_neg) {
         return "please, wait"
      }
      return click_point_chart(
         fracto_values.orbital_points,
         [Q_core_neg])
   }
}

export default FractoOrbitalChart
