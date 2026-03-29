import React, {Component} from 'react';
import PropTypes from 'prop-types';

import {CompPointsStyles as styles} from 'styles/CompPointsStyles'
import {
   click_point_chart,
   escape_points_chart
} from "./PatternsUtils";
import AppErrorBoundary from "common/app/AppErrorBoundary";

export class ScatterCharts extends Component {
   static propTypes = {
      page_settings: PropTypes.object.isRequired,
      on_settings_changed: PropTypes.func.isRequired,
   }

   state = {
      width_px: 0,
      height_px: 0,
      click_point_info: null,
   }

   componentDidMount() {
   }

   componentDidUpdate(prevProps, prevState, snapshot) {
   }

   render_scatter_chart = () => {
      const {click_point_info} = this.state
      if (!click_point_info) {
         return []
      }
      const {click_point, pattern, orbital_points, in_cardioid, Q_core_neg} = click_point_info
      if (pattern) {
         const set2 = [Q_core_neg]
         return click_point_chart(orbital_points, set2, in_cardioid, false)
      }
      return escape_points_chart(click_point, in_cardioid)
   }

   render_chart = (content, width_px, height_px) => {
      const chart_style = {
         width: `${width_px}px`,
         height: `${height_px}px`,
      }
      return <AppErrorBoundary fallback={rendered_area}>
         <styles.GraphWrapper
            style={chart_style}>
            {content}
         </styles.GraphWrapper>
      </AppErrorBoundary>
   }

   render = () => {
      const {width_px} = this.state
      const scatter_chart_height_px = width_px * 1.01
      const scatter_chart = this.render_scatter_chart()
      return <styles.ChartWrapper>
         {this.render_chart(
            scatter_chart,
            width_px,
            scatter_chart_height_px - 20)}
      </styles.ChartWrapper>
   }
}

export default ScatterCharts
