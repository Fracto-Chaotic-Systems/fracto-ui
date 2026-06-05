import React, {Component} from "react";

import FractoFastCalc from "../../../../../../sdk/FractoFastCalc.js";

import {MainStyles as styles, MARGIN_PX} from '../../../styles/MainStyles.jsx'
import AppSettings from "../../../AppSettings.jsx";
import {KEY_STUDY_POINTS_FRAME_SETTINGS, KEY_STUDY_SPLITTER_POS_PX} from "../../../settings/StudySettings.jsx";

import {update_dimensions} from "./../../PageUtils.jsx";
import {click_point_chart} from "../../../utils/render/PatternsUtils.jsx";
import ChartOrbitals from "../../../chart/ChartOrbitals.jsx";
import DataBackend from "../../../backend/DataBackend.jsx";
import PointsSeriesTable from "./PointsSeriesTable.jsx";

const UPDATE_INTERVAL_MS = 1000

const reduce_point_data = (point_data) => {
   return point_data
   const re_strs = point_data.map((data) => {
      return data.point.re
   })
   const im_strs = point_data.map((data) => {
      return data.point.im
   })
   const reduced_re_strs = reduce_str_list(re_strs)
   const reduced_im_strs = reduce_str_list(re_strs)


   const firstWord = strs[0];

   for (let i = 0; i < firstWord.length; i++) {
      const char = firstWord[i];

      // Check if this character matches all other words
      for (let j = 1; j < strs.length; j++) {
         if (strs[j][i] !== char) {
            return i; // Mismatch found, return the count so far
         }
      }
   }

   return firstWord.length; // All words are perfectly identical
}

export class PointsMainPanel extends Component {
   state = {
      rendered_width: 0,
      rendered_height: 0,
      interval: null,
      frame_settings: {},
      point_data: null,
      subscription: null,
      in_fetch: false,
      chart_data: [],
      set2: [],
   }

   componentDidMount() {
      this.update_dimensions()
      this.setState({
         interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
         frame_settings: AppSettings
            .get(KEY_STUDY_POINTS_FRAME_SETTINGS),
         subscription: AppSettings
            .subscribe(KEY_STUDY_POINTS_FRAME_SETTINGS, this.on_frame_settings_changed)
      })
   }

   componentWillUnmount() {
      const {interval, subscription} = this.state
      if (interval) {
         clearInterval(interval)
      }
      if (subscription) {
         AppSettings.unsubscribe(subscription)
      }
   }

   on_frame_settings_changed = (key, value) => {
      if (Number.isNaN(value.focal_point.x) || Number.isNaN(value.focal_point.y)) {
         console.log('on_frame_settings_changed bad number', value)
         return
      }
      let set2 = []
      if (value && value.focal_point) {
         console.log('value', value)
         const {focal_point} = value
         const Q_core_neg = FractoFastCalc.calculate_cardioid_Q(
            focal_point.x,
            focal_point.y, -1)
         set2 = [Q_core_neg]
      }
      this.setState({
         frame_settings: value,
         set2,
      })
      this.on_chart_update(key, value)
   }

   update_dimensions = () => {
      const {rendered_width, rendered_height} = this.state;
      const new_values = update_dimensions(rendered_width, rendered_height, KEY_STUDY_SPLITTER_POS_PX)
      if (new_values) {
         this.setState(new_values)
      }
   }

   on_chart_update = (key, value) => {
      const {in_fetch} = this.state
      if (in_fetch) {
         return
      }
      this.setState({in_fetch: true})
      DataBackend.get_orbital(value.focal_point, 1, point_data => {
         const {set2} = this.state
         if (!point_data || !point_data.result) {
            this.setState({
               chart_data: [],
               in_fetch: false,
            })
            return
         }
         let chart_data = []
         chart_data = point_data.result.map(data => {
            return {
               x: parseFloat(data.point.re),
               y: parseFloat(data.point.im),
               x_str: data.point.re,
               y_str: data.point.im,
            }
         })
         chart_data.unshift({x: set2[0].x, y: set2[0].y})
         this.setState({
            chart_data,
            in_fetch: false
         })
      })
   }

   get_table_data = () => {
      const {chart_data} = this.state
      return chart_data.map((data, step) => {
         const {x_str, y_str} = data
         return {x: x_str, y: y_str, step}
      })
   }

   render() {
      const {set2, chart_data} = this.state
      const width_px = 400
      const chart_style = {
         display: 'inline-block',
         margin: `${MARGIN_PX}px auto`,
         width: `${width_px}px`,
         height: `${width_px}px`,
         boxShadow: '5px 5px 10px rgba(0, 0, 0, 0.25)',
         backgroundColor: '#f8f8f8',
         cursor: 'pointer',
      }
      const table_data = this.get_table_data()
      const page_style = {
         height: '100rem',
      }
      return <styles.ScrollingBlock
         style={page_style}
         key={'orbitals-table'}>
         <div style={chart_style}>
            {click_point_chart(
               chart_data,
               set2,
               false,
               false,
               // backgroundImagePlugin)}
            )}
         </div>
         <ChartOrbitals
            key={'orbitals-chart'}
            width_px={width_px}
            height_px={width_px}
         />
         <PointsSeriesTable
            table_data={table_data}
         />
      </styles.ScrollingBlock>
   }
}

export default PointsMainPanel
