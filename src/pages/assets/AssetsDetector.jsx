import React, {Component} from "react";

import {update_dimensions} from "./../PageUtils.jsx";

import {MainStyles as styles, MARGIN_PX} from '../../styles/MainStyles.jsx'
import AppSettings from "../../AppSettings.jsx";
import {
   KEY_ASSETS_DETECTOR_FRAME_SETTINGS, KEY_ASSETS_DETECTOR_SPLITTER_POS,
   KEY_ASSETS_SPLITTER_POS_PX
} from "../../settings/AssetsSettings.jsx";
import AppText from "../../AppText.jsx";
import {KEY_ASSETS_DETECTOR} from "../../text/AssetsText.jsx";
import {ASSETS_DETECTOR_SPLITTER_KEYS} from "../../navigator/NavigatorKeys.jsx";
import NavigatorSplitterLayout from "../../navigator/NavigatorSplitterLayout.jsx";
import * as canvas from "@fortawesome/free-solid-svg-icons/fa0";

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
   }

   componentDidMount() {
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
      this.find_minima(value)
      console.log('on_frame_settings_changed',value)
      this.setState({frame_settings: value})
   }

   find_minima = (value) => {
      const {canvas_buffer} = value
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
         .slice(0, 15)

      // console.log('all_minima', all_minima)
      this.setState({all_minima})
   }

   render() {
      const {container_ref, rendered_height, rendered_width, frame_settings} = this.state
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
            right content
         </styles.FixedBlock>
      ];
   }
}

export default AssetsDetector
