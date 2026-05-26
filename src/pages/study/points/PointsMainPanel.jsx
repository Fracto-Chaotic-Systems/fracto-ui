import React, {Component} from "react";

import {MainStyles as styles, MARGIN_PX} from '../../../styles/MainStyles.jsx'
import AppSettings from "../../../AppSettings.jsx";
import {KEY_STUDY_POINTS_FRAME_SETTINGS, KEY_STUDY_SPLITTER_POS_PX} from "../../../settings/StudySettings.jsx";
import {FRACTO_DATA_PORT, FRACTO_UI_PORT} from "../../../../../../constants.js";
import {FETCH_JSON_HEADERS} from "../StudyUtils.jsx";

const UPDATE_INTERVAL_MS = 1000
const MAX_DEPTH = 10

export class PointsMainPanel extends Component {
   state = {
      rendered_width: 0,
      rendered_height: 0,
      interval: null,
      frame_settings: {},
      point_data: null,
      subscription: null,
      in_fetch: false,
      data_runs: null,
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

   recurse_point_data = (node, results) => {
      if (node.plus) {
         this.recurse_point_data(node.plus, results)
      }
      if (node.minus) {
         this.recurse_point_data(node.minus, results)
      }
      if (node.point_path) {
         results.push(node.point_path)
      }
   }

   process_point_data = (point_data) => {
      const data_runs = []
      this.recurse_point_data(point_data.plus, results)
      this.recurse_point_data(point_data.minus, results)
      console.log(data_runs)
      this.setState({data_runs})
   }

   on_frame_settings_changed = (key, value) => {
      const {in_fetch} = this.state
      if (in_fetch) {
         return
      }
      if (Number.isNaN(value.focal_point.x) || Number.isNaN(value.focal_point.y)) {
         console.log('on_frame_settings_changed bad number', value)
         return
      }
      this.setState({in_fetch: true})
      const origin = window.origin.replace(`${FRACTO_UI_PORT}`, `${FRACTO_DATA_PORT}`)
      setTimeout(async () => {
         const all_params = [
            `re=${value.focal_point.x}`,
            `im=${value.focal_point.y}`,
            `max_depth=${MAX_DEPTH}`,
         ].join('&')
         const url = `${origin}/orbital?${all_params}`
         console.log(`fetching ${url}`)
         const point_data = await fetch(url, FETCH_JSON_HEADERS)
            .then(res => {
               return res.json()
            })
         if (point_data) {
            // console.log('point_data', point_data)
            this.process_point_data(point_data.result.all_paths)
         }
         this.setState({in_fetch: false})
      }, 250)
   }

   update_dimensions = () => {
      const {rendered_width, rendered_height} = this.state;
      const new_values = update_dimensions(rendered_width, rendered_height, KEY_STUDY_SPLITTER_POS_PX)
      if (new_values) {
         this.setState(new_values)
      }
   }

   render() {
      const {data_runs} = this.state
      return `PointsMainPanel ${data_runs.length} runs`
   }
}

export default PointsMainPanel
