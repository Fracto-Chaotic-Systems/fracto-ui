import React, {Component} from "react";
import PropTypes from "prop-types";

import {ChartStyles as styles} from './ChartStyles.jsx'

const EPSILON = 0.0001
export const GRID_CONFIG = {
   color: function (context) {
      const pi_grid = context.tick.value / (Math.PI * 2)
      const diff = Math.abs(pi_grid - Math.round(pi_grid))
      if (diff < EPSILON && pi_grid > EPSILON) {
         return '#888888'
      }
      return context.tick.value === 0 ? '#aaaaaa' : '#dddddd'
   },
   lineWidth: function (context) {
      const pi_grid = context.tick.value / (Math.PI * 2)
      const diff = Math.abs(pi_grid - Math.round(pi_grid))
      if (diff < EPSILON && pi_grid > EPSILON) {
         return 1.5
      }
      return context.tick.value === 0 ? 1.5 : 1
   }
};

export const get_scatter_options = (bounds) => {
   return {
      scales: {
         x: {
            grid: GRID_CONFIG,
            ticks: {display: false},
            min: bounds.min_x,
            max: bounds.max_x,
         },
         y: {
            grid: GRID_CONFIG,
            ticks: {display: false},
            min: bounds.min_y,
            max: bounds.max_y,
         },
      },
      animation: false,
      maintainAspectRatio: false,
      plugins: {
         legend: {
            display: false,
         },
      },
   }
}

export class ChartOrbitals extends Component {
   static propTypes = {
      height_px: PropTypes.number.isRequired,
      width_px: PropTypes.number.isRequired,
      data_sets: PropTypes.object,
      options: PropTypes.object,
   }

   static defaultProps = {
      options: {},
      data_sets: [],
   }

   render() {
      const {width_px, height_px} = this.props
      const chart_style = {
         textAlign: "center",
         width: width_px,
         height: height_px,
      }
      return [
         <styles.InlineChartWrapper
            style={chart_style}
            key={'chart'}>
            ChartOrbital
         </styles.InlineChartWrapper>
      ]
   }
}

export default ChartOrbitals
