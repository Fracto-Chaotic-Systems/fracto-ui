import React, {Component} from "react";

import {FRACTO_DATA_PORT, FRACTO_UI_PORT} from "../../../../../constants.js";

import {
   MainStyles as styles,
   MARGIN_PX
} from '../../styles/MainStyles.jsx'
import AppSettings from "../../AppSettings.jsx";
import {
   KEY_ASSETS_DETECTOR_FRAME_SETTINGS, KEY_ASSETS_DETECTOR_IS_NODE,
   KEY_ASSETS_DETECTOR_SPLITTER_POS,
   KEY_ASSETS_SPLITTER_POS_PX
} from "../../settings/AssetsSettings.jsx";
import {ASSETS_DETECTOR_SPLITTER_KEYS} from "../../navigator/NavigatorKeys.jsx";
import AppText from "../../AppText.jsx";
import {KEY_ASSETS_DETECTOR} from "../../text/AssetsText.jsx";
import {checkmark_icon} from "../../utils/ui/CoolIcons.jsx";

import MinibrotBackend from "../../backend/MinibrotBackend.jsx";
import NavigatorSplitterLayout from "../../navigator/NavigatorSplitterLayout.jsx";
import {update_dimensions} from "../PageUtils.jsx";
import {FETCH_JSON_HEADERS} from "../study/StudyUtils.jsx";
import {
   PAGE_TILES_GENERATE,
   send_to
} from "../utils/SendTo.jsx";
import {
   render_magnitude,
   render_pattern_block,
} from "../study/StudyUtils.jsx";
import {
   detect_now,
   highlight_existing,
} from "./detector/DetectorUtils.js";
import CoolStyles from "../../utils/ui/styles/CoolStyles.jsx";
import DataBackend from "../../backend/DataBackend.jsx";

const UPDATE_INTERVAL_MS = 1000

export class AssetsDetector extends Component {
   state = {
      rendered_width: 0,
      rendered_height: 0,
      frame_settings: {},
      container_ref: React.createRef(),
      interval: null,
      subscription: null,
      minibrot_list: [],
      new_bailiwick: null,
      is_node: 0,
   }

   componentDidMount() {
      this.load_minibrots()
      this.setState({
         frame_settings: AppSettings
            .get(KEY_ASSETS_DETECTOR_FRAME_SETTINGS),
         interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
         subscription: AppSettings.subscribe(
            ASSETS_DETECTOR_SPLITTER_KEYS.frame_settings_key,
            this.on_frame_settings_changed),
         is_node: AppSettings.get(KEY_ASSETS_DETECTOR_IS_NODE)
            ? 1 : 0,
      })
   }

   componentDidUpdate(prevProps, prevState, snapshot) {
      if (prevState.is_node !== this.state.is_node) {
         this.load_minibrots()
      }
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

   highlight_existing=()=>{
      const {minibrot_list, frame_settings} = this.state
      highlight_existing(minibrot_list, frame_settings)
   }

   on_frame_settings_changed = async (key, value) => {
      // console.log('on_frame_settings_changed', value)
      this.setState({frame_settings: value})
      setTimeout(this.highlight_existing, 150)
   }

   load_minibrots = async () => {
      const {is_node} = this.state
      const params = {
         is_node: is_node ? 1 : 0,
      }
      DataBackend.get_minibrots(params, minibrot_list=>{
         this.setState({minibrot_list})
      })
   }

   detect_now = () => {
      const {frame_settings} = this.state
      const new_bailiwick = detect_now(frame_settings)
      if (new_bailiwick) {
         MinibrotBackend.save_bailiwick(
            new_bailiwick, 0, response => {
               console.log(response)
            })
         this.setState({new_bailiwick})
      }
   }

   enhance = () => {
      const {frame_settings} = this.state
      send_to(frame_settings, PAGE_TILES_GENERATE)
   }

   set_nodal = () => {
      const {is_node} = this.state
      AppSettings.on_settings_changed({
         [KEY_ASSETS_DETECTOR_IS_NODE]: !is_node,
      })
      this.setState({is_node: !is_node})
   }

   render_nodal_check = () => {
      const {is_node} = this.state
      const checkmark_style = {
         width: '16px',
         height: '16px',
         fill: 'green',
      }
      const checkmark = is_node
         ? <CoolStyles.InlineBlock
            style={checkmark_style}>
            {checkmark_icon}
         </CoolStyles.InlineBlock>
         : 'not'
      return <styles.NormalLink
         onClick={this.set_nodal}>
         {checkmark} nodal
      </styles.NormalLink>
   }

   render_right_block = (top) => {
      const {new_bailiwick} = this.state
      const splitter_pos = AppSettings.get(KEY_ASSETS_DETECTOR_SPLITTER_POS)
      const right_block_style = {
         left: `${splitter_pos + MARGIN_PX}px`,
         top: `${top + MARGIN_PX}px`,
      }
      const detect_button_style = {
         marginRight: '1rem',
      }
      const detect_button = <styles.BlueButton
         style={detect_button_style}
         onClick={this.detect_now}>
         detect now
      </styles.BlueButton>
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
            <styles.HalfRemSpacer/>,
         ]
         : ''
      return <styles.FixedBlock style={right_block_style}>
         {detect_button} {details}
         {this.render_nodal_check()}
      </styles.FixedBlock>
   }

   get_bounding_rect = () => {
      const {container_ref, rendered_height, rendered_width} = this.state
      let top = 0;
      let left = 0;
      if (container_ref.current) {
         const container_bounds = container_ref.current.getBoundingClientRect()
         top = container_bounds.top
         left = container_bounds.left
      }
      return {
         top, left,
         width: rendered_width,
         height: rendered_height
      }
   }

   render() {
      const {minibrot_list, frame_settings, container_ref} = this.state
      const bounding_rect = this.get_bounding_rect()
      // highlight_existing(minibrot_list, frame_settings)
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
         this.render_right_block(bounding_rect.top),
      ];
   }
}

export default AssetsDetector
