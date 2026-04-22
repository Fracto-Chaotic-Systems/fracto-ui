import React, {Component} from 'react';
import PropTypes from "prop-types";
import {click_point_chart} from "./PatternsUtils.jsx";
import FractoFastCalc from "../../../../../sdk/FractoFastCalc.js";
import {copy_json} from "../Dom.jsx";

const ANIMATION_REFRESH_MS = 500

export class FractoOrbitalChart extends Component {
   static propTypes = {
      width_px: PropTypes.number.isRequired,
      focal_point: PropTypes.object.isRequired,
      in_animation: PropTypes.bool.isRequired,
   }

   state = {
      fracto_values: null,
      Q_core_neg: null,
      Q_core_pos: null,
      animation_index: 0,
      interval: null
   }

   componentDidMount() {
      this.update_data()
      this.init_animation()
   }

   componentDidUpdate(prevProps, prevState, snapshot) {
      const focal_x_changed = prevProps.focal_point.x !== this.props.focal_point.x
      const focal_y_changed = prevProps.focal_point.y !== this.props.focal_point.y
      if (focal_y_changed || focal_x_changed) {
         this.update_data()
      }
      const in_animation_changed = prevProps.in_animation !== this.props.in_animation
      if (in_animation_changed) {
         this.init_animation()
      }
   }

   init_animation = () => {
      const {interval, fracto_values} = this.state
      const {in_animation} = this.props
      if (interval) {
         clearInterval(interval)
      }
      this.setState({
         interval: null,
         animation_index: 0,
      })
      if (in_animation && fracto_values) {
         const interval = setInterval(() => {
            let next_index = 1
            if (this.state.animation_index < fracto_values.orbital_points.length - 1) {
               next_index = this.state.animation_index + 1
            }
            this.setState({animation_index: next_index})
         }, ANIMATION_REFRESH_MS)
         this.setState({interval: interval})
      }
   }

   componentWillUnmount() {
      const {interval} = this.state
      if (interval) {
         clearInterval(interval)
      }
   }

   update_data = () => {
      const {interval} = this.state
      const {focal_point} = this.props
      const {x, y} = focal_point
      const fracto_values = FractoFastCalc.calc(x, y)
      const Q_core_neg = FractoFastCalc.calculate_cardioid_Q(x, y, -1)
      const Q_core_pos = FractoFastCalc.calculate_cardioid_Q(x, y, 1)
      this.setState({
         fracto_values,
         Q_core_neg,
         Q_core_pos,
         interval: null
      })
      if (interval) {
         clearInterval(interval)
      }
   }

   render() {
      const {fracto_values, Q_core_neg, Q_core_pos, animation_index} = this.state
      const {in_animation} = this.props
      if (!fracto_values || !Q_core_neg) {
         return "please, wait"
      }
      const other_sets = in_animation && fracto_values.orbital_points.length > animation_index
         ? [Q_core_neg, fracto_values.orbital_points[animation_index]]
         : [Q_core_neg, Q_core_pos]
      return click_point_chart(
         fracto_values.orbital_points,
         other_sets)
   }
}

export default FractoOrbitalChart
