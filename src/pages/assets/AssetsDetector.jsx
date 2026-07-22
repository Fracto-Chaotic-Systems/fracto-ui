import React, {Component} from "react";

import {
   render_magnitude,
   render_pattern_block,
} from "../../pages/study/StudyUtils.jsx";
import {update_dimensions} from "./../PageUtils.jsx";

import {MainStyles as styles, MARGIN_PX} from '../../styles/MainStyles.jsx'
import AppSettings from "../../AppSettings.jsx";
import {
   KEY_ASSETS_DETECTOR_FRAME_SETTINGS,
   KEY_ASSETS_DETECTOR_SPLITTER_POS,
   KEY_ASSETS_SPLITTER_POS_PX
} from "../../settings/AssetsSettings.jsx";
import AppText from "../../AppText.jsx";
import {KEY_ASSETS_DETECTOR} from "../../text/AssetsText.jsx";
import {ASSETS_DETECTOR_SPLITTER_KEYS} from "../../navigator/NavigatorKeys.jsx";
import NavigatorSplitterLayout from "../../navigator/NavigatorSplitterLayout.jsx";
import {FRACTO_DATA_PORT, FRACTO_UI_PORT} from "../../../../../constants.js";
import {FETCH_JSON_HEADERS} from "../study/StudyUtils.jsx";
import {find_minibrot} from "./AssetsUtils.jsx";
import MinibrotBackend from "../../backend/MinibrotBackend.jsx";
import {PAGE_TILES_GENERATE, send_to} from "../utils/SendTo.jsx";

const UPDATE_INTERVAL_MS = 1000

export class AssetsDetector extends Component {
   state = {
      rendered_width: 0,
      rendered_height: 0,
      frame_settings: {},
      container_ref: React.createRef(),
      interval: null,
      subscription: null,
      all_minima: [],
      minibrot_list: [],
      new_bailiwick: null,
   }

   componentDidMount() {
      this.load_minibrots()
      this.setState({
         frame_settings: AppSettings
            .get(KEY_ASSETS_DETECTOR_FRAME_SETTINGS),
         interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
         subscription: AppSettings.subscribe(
            ASSETS_DETECTOR_SPLITTER_KEYS.frame_settings_key,
            this.on_frame_settings_changed)
      })
   }

   componentWillUnmount() {
      const {interval} = this.state
      if (interval) {
         clearInterval(interval)
      }
   }

   update_dimensions = () => {
      const {rendered_width, rendered_height} = this.state;
      const new_values = update_dimensions(rendered_width, rendered_height, KEY_ASSETS_SPLITTER_POS_PX)
      if (new_values) {
         this.setState(new_values)
      }
   }

   on_frame_settings_changed = async (key, value) => {
      // console.log('on_frame_settings_changed', value)
      this.setState({frame_settings: value})
      setTimeout(this.highlight_existing, 500)
   }

   load_minibrots = async () => {
      const origin = window.origin.replace(`${FRACTO_UI_PORT}`, `${FRACTO_DATA_PORT}`)
      const url = `${origin}/minibrots`
      const fetched = await fetch(url, FETCH_JSON_HEADERS).then(res => {
         return res.json()
      })
      const minibrot_list = fetched.result
      console.log('minibrot_list', minibrot_list)
      this.setState({minibrot_list})
   }

   find_minima = () => {
      const {frame_settings} = this.state
      const {canvas_buffer} = frame_settings
      if (!canvas_buffer) {
         return;
      }
      const pattern_minima = {}
      for (let x = 0; x < canvas_buffer.length; x++) {
         const row = canvas_buffer[x]
         for (let y = 0; y < row.length; y++) {
            const element = row[y]
            const [pattern, interations] = element
            if (!pattern) {
               continue
            }
            const key = `_${pattern}`
            if (!Object.hasOwn(pattern_minima, key)) {
               pattern_minima[key] = {pattern, interations, x, y}
            } else if (pattern_minima[key].interations > interations) {
               pattern_minima[key] = {pattern, interations, x, y}
            }
         }
      }
      const all_minima = Object
         .values(pattern_minima)
         .sort((a, b) => a.interations - b.interations)
         .slice(0, 10)

      this.setState({all_minima})
   }

   highlight_potentials = () => {
      const {frame_settings, all_minima} = this.state
      const {ctx} = frame_settings
      if (!ctx || typeof ctx.beginPath !== 'function') {
         console.log('highlight_potentials: ctx bad', ctx)
         return;
      }
      all_minima.forEach(minima => {
         if (!minima.x) {
            console.log('highlight_potentials: minima.x bad', minima)
            return
         }
         ctx.beginPath();
         ctx.strokeStyle = '#FFFFFFF0';
         ctx.lineWidth = 1;
         ctx.arc(minima.x, minima.y, 12, 0, 2 * Math.PI);
         ctx.stroke();
      })
   }

   highlight_existing = () => {
      const {minibrot_list, frame_settings} = this.state
      if (!Object.hasOwn(frame_settings, 'focal_point')) {
         return
      }
      const {ctx} = frame_settings
      if (!ctx || typeof ctx.beginPath !== 'function') {
         console.log('highlight_existing: ctx bad', frame_settings)
         return;
      }
      const half_scope = frame_settings.scope / 2
      const leftmost = frame_settings.focal_point.x - half_scope
      const rightmost = frame_settings.focal_point.x + half_scope
      const topmost = frame_settings.focal_point.y + half_scope
      const bottommost = frame_settings.focal_point.y - half_scope
      const minibrots_in_field = minibrot_list
         .filter(minibrot => {
            const core_point = JSON.parse(minibrot.core_point)
            if (core_point.x < leftmost) {
               return false
            }
            if (core_point.x > rightmost) {
               return false
            }
            if (core_point.y > topmost) {
               return false
            }
            if (core_point.y < bottommost) {
               return false
            }
            return true
         })
      minibrots_in_field
         .sort((a, b) => {
            return b.magnitude - a.magnitude
         })
         .forEach((minibrot, i) => {
            const core_point = JSON.parse(minibrot.core_point)
            const x = (core_point.x - leftmost) * frame_settings.width_px / frame_settings.scope
            const y = (topmost - core_point.y) * frame_settings.width_px / frame_settings.scope
            let width_px = 0
            let color = '#FFFFFF00'
            let line_width = 0
            let text = ''
            if (i < 10) {
               color = '#FFFFFFFF'
               width_px = 12
               line_width = 1.25
               text = `${Math.round(minibrot.magnitude * 1000000)}`
            } else if (i < 50) {
               color = '#FFFFFFa0'
               width_px = 6
               line_width = 1.0
            } else if (i < 250) {
               color = '#FFFFFF80'
               width_px = 3
               line_width = 0.75
            } else if (i < 1250) {
               color = '#FFFFFF40'
               width_px = 1
               line_width = 0.5
            }
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = line_width;
            ctx.strokeRect(
               x - (width_px / 2),
               y - (width_px / 2),
               width_px,
               width_px);
            ctx.fillStyle = '#eeeeeeC0';
            ctx.fillText(text, x + width_px, y + width_px / 2);
            ctx.font = '14px monospace';
         })
   }

   detect_now = () => {
      const {frame_settings} = this.state
      if (!Object.hasOwn(frame_settings, 'canvas_buffer')) {
         return
      }
      const {canvas_buffer} = frame_settings
      if (!canvas_buffer) {
         return;
      }
      const [core_point, octave_point, pattern] = find_minibrot(
         canvas_buffer,
         frame_settings.focal_point,
         frame_settings.scope)
      if (!pattern) {
         this.setState({new_bailiwick: null})
         return
      }
      const x_diff = core_point.x - octave_point.x
      const y_diff = core_point.y - octave_point.y
      const magnitude = Math.sqrt(x_diff * x_diff + y_diff * y_diff)
      const display_settings = {
         focal_point: {
            x: (core_point.x + octave_point.x) / 2,
            y: (core_point.y + octave_point.y) / 2
         },
         scope: magnitude * 3
      }
      const new_bailiwick = {
         pattern,
         magnitude,
         core_point,
         octave_point,
         display_settings,
      }
      console.log('new_bailiwick', new_bailiwick)
      this.setState({new_bailiwick})
      AppSettings.on_settings_changed({
         [KEY_ASSETS_DETECTOR_FRAME_SETTINGS]: {
            focal_point: display_settings.focal_point,
            scope: display_settings.scope,
         }
      })
      MinibrotBackend.save_bailiwick(
         new_bailiwick, 0, response => {
            console.log(response)
         })
   }

   enhance = () => {
      const {frame_settings} = this.state
      send_to(frame_settings, PAGE_TILES_GENERATE)
   }

   render() {
      const {new_bailiwick, container_ref, rendered_height, rendered_width, frame_settings} = this.state
      let top = 0;
      let left = 0;
      if (container_ref.current) {
         const container_bounds = container_ref.current.getBoundingClientRect()
         top = container_bounds.top
         left = container_bounds.left
      }
      const bounding_rect = {
         top,
         left,
         width: rendered_width,
         height: rendered_height,
      }
      const splitter_pos = AppSettings.get(KEY_ASSETS_DETECTOR_SPLITTER_POS)
      const right_block_style = {
         left: `${splitter_pos + MARGIN_PX}px`,
         top: `${top + MARGIN_PX}px`,
      }
      // this.highlight_potentials()
      this.highlight_existing()
      const enhance_button = <styles.BlueButton
         onClick={this.enhance}>
         enhance
      </styles.BlueButton>
      const details = new_bailiwick
         ? [
            render_pattern_block(new_bailiwick.pattern),
            <styles.HalfRemSpacer/>,
            render_magnitude(new_bailiwick.magnitude),
            <styles.HalfRemSpacer/>,
            enhance_button,
         ]
         : ''
      const detect_button = <styles.BlueButton
         onClick={this.detect_now}>
         detect now
      </styles.BlueButton>
      return [
         <styles.SectionTitle
            key={'study-overview-title'}>
            {AppText.get(KEY_ASSETS_DETECTOR)}
         </styles.SectionTitle>,
         <styles.TightCenteredBlock
            ref={container_ref}
            key={'generator-content'}>
            <NavigatorSplitterLayout
               bounding_rect={bounding_rect}
               frame_settings={frame_settings}
               frame_settings_key={KEY_ASSETS_DETECTOR_FRAME_SETTINGS}
               splitter_keys={ASSETS_DETECTOR_SPLITTER_KEYS}
            />
         </styles.TightCenteredBlock>,
         <styles.FixedBlock style={right_block_style}>
            {detect_button} {details}
         </styles.FixedBlock>
      ];
   }
}

export default AssetsDetector
