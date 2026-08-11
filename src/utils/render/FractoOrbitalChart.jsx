import React, {Component} from 'react';
import PropTypes from "prop-types";
import {click_point_chart} from "./PatternsUtils.jsx";
import FractoFastCalc from "../../../../../sdk/FractoFastCalc.js";
import {fill_canvas} from "./FractoRasterImage.jsx";
import {copy_json} from "../Dom.jsx";

const ANIMATION_REFRESH_MS = 500

export const backgroundImagePlugin = {
   id: 'customCanvasBackgroundImage',
   beforeDraw: async (chart) => {
      const focal_point = {
         x: (chart.scales.x.max + chart.scales.x.min) / 2,
         y: (chart.scales.y.max + chart.scales.y.min) / 2,
      }
      // console.log('fracto_values', backgroundImagePlugin.fracto_values);
      const scope = chart.scales.x.max - chart.scales.x.min
      const width_px = chart.width
      chart.ctx.save();
      const {ctx, chartArea: {top, bottom, left, right, width, height}} = chart;
      chart.ctx.clearRect(0, 0, width + left + right, height + top + bottom);
      chart.ctx.globalCompositeOperation = 'destination-over'; // Draw behind
      await fill_canvas(
         chart.ctx,
         width_px,
         focal_point,
         scope,
         1.0,
         null,
         1.5,
         0.15)
      chart.ctx.restore();
   }
};

export class FractoOrbitalChart extends Component {
   static propTypes = {
      width_px: PropTypes.number.isRequired,
      focal_point: PropTypes.object.isRequired,
      in_animation: PropTypes.bool.isRequired,
      ready: PropTypes.bool.isRequired,
   }

   state = {
      fracto_values: null,
      Q_core_neg: null,
      Q_core_pos: null,
      animation_index: 0,
      interval: null,
      chart: null,
      in_progress: false,
   }

   componentDidMount() {
      this.update_data()
      this.init_animation()
   }

   componentDidUpdate(prevProps, prevState, snapshot) {
      const focal_x_changed = prevProps.focal_point.x !== this.props.focal_point.x
      const focal_y_changed = prevProps.focal_point.y !== this.props.focal_point.y
      const ready_changed = prevProps.ready !== this.props.ready
      if (focal_y_changed || focal_x_changed || ready_changed) {
         this.update_data()
      } else {
         const in_animation_changed = prevProps.in_animation !== this.props.in_animation
         if (in_animation_changed) {
            this.init_animation()
         }
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
      backgroundImagePlugin.fracto_values = copy_json(fracto_values)
      this.setState({
         fracto_values: copy_json(fracto_values),
         Q_core_neg,
         Q_core_pos,
         interval: null
      })
      if (interval) {
         clearInterval(interval)
      }
   }

   other_sets = () => {
      const {fracto_values, Q_core_neg, Q_core_pos, animation_index} = this.state
      const {in_animation} = this.props
      return in_animation && fracto_values.orbital_points.length > animation_index
         ? [Q_core_neg, fracto_values.orbital_points[animation_index]]
         : [Q_core_neg, Q_core_pos]
   }

   render() {
      const {fracto_values} = this.state
      const {in_animation} = this.props
      if (!fracto_values) {
         return "please, wait"
      }
      const other_sets = this.other_sets()
      return click_point_chart(
         fracto_values.orbital_points,
         other_sets,
         false,
         false,
         // in_animation ? null : backgroundImagePlugin)
      )
   }
}

export default FractoOrbitalChart
