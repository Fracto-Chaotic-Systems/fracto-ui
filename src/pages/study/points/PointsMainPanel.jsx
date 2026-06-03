import React, {Component} from "react";

import {
   FRACTO_DATA_PORT,
   FRACTO_UI_PORT
} from "../../../../../../constants.js";
import FractoFastCalc from "../../../../../../sdk/FractoFastCalc.js";

import {MainStyles as styles, MARGIN_PX} from '../../../styles/MainStyles.jsx'
import AppSettings from "../../../AppSettings.jsx";
import {KEY_STUDY_POINTS_FRAME_SETTINGS, KEY_STUDY_SPLITTER_POS_PX} from "../../../settings/StudySettings.jsx";
import {FETCH_JSON_HEADERS} from "../StudyUtils.jsx";

import {update_dimensions} from "./../../PageUtils.jsx";
import {
   CELL_ALIGN_CENTER,
   CELL_TYPE_TEXT,
   TABLE_CAN_SELECT,
   TABLE_NO_HEADER
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import CoolTable from "../../../utils/ui/CoolTable.jsx";
import {click_point_chart} from "../../../utils/render/PatternsUtils.jsx";

const UPDATE_INTERVAL_MS = 1000
const MAX_DEPTH = 12

const TABLE_COLUMNS = [
   {
      id: "code",
      label: "code",
      type: CELL_TYPE_TEXT,
      width_px: 35,
      align: CELL_ALIGN_CENTER,
   },
]

export class PointsMainPanel extends Component {
   state = {
      rendered_width: 0,
      rendered_height: 0,
      interval: null,
      frame_settings: {},
      point_data: null,
      subscription: null,
      in_fetch: false,
      data_runs: [],
      unique_points: {},
      selected_run: null,
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
      const {in_fetch, chart_data} = this.state
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
      this.setState({in_fetch: true})
      const origin = window.origin.replace(`${FRACTO_UI_PORT}`, `${FRACTO_DATA_PORT}`)
      setTimeout(async () => {
         const {set2} = this.state
         const all_params = [
            `re=${value.focal_point.x}`,
            `im=${value.focal_point.y}`,
         ].join('&')
         const url = `${origin}/orbital?${all_params}`
         console.log(`fetching ${url}`)
         const point_data = await fetch(url, FETCH_JSON_HEADERS)
            .then(res => {
               return res.json()
            })
         let chart_data = []
         if (point_data) {
            // console.log('point_data.result', point_data.result)
            chart_data = point_data.result.map(data => {
               return {
                  x: parseFloat(data.point.re),
                  y: parseFloat(data.point.im),
               }
            })
         }
         // console.log('chart_data', chart_data)
         chart_data.unshift({x: set2[0].x, y: set2[0].y})
         this.setState({chart_data, in_fetch: false})
      }, 250)
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
      return [
         <div style={chart_style}>
            {click_point_chart(
               chart_data,
               set2,
               false,
               false,
               // backgroundImagePlugin)}
            )}
         </div>,
      ]
   }
}

export default PointsMainPanel
