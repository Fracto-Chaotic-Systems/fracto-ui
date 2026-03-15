import React, {Component} from 'react';
import PropTypes from 'prop-types';

import {CoolStyles} from "../utils/ui/styles/CoolStyles.jsx";
import CoolSplitter, {
   SPLITTER_TYPE_HORIZONTAL,
   SPLITTER_TYPE_VERTICAL
} from "../utils/ui/CoolSplitter.jsx";

import {NavigatorStyles as styles} from "../styles/NavigatorStyles.jsx";
import {
   DEFAULT_SIDEBAR_WIDTH,
   SPLITTER_WIDTH_PX,
   STEPS_WIDTH_MAX_PX,
   STEPS_WIDTH_MIN_PX,
} from "../constants.jsx";
import AppSettings from "../AppSettings.jsx";

import NavigatorSteps from "./NavigatorSteps.jsx";
import NavigatorLegend from "./NavigatorLegend.jsx";
import NavigatorField from "./NavigatorField.jsx";

const MAX_MAIN_SPLITTER_POS = 800;
const FIELD_BACKGROUND_COLOR = "#666666";
const STEPS_BACKGROUND_COLOR = "#aaaaaa";
const LEGEND_BACKGROUND_COLOR = "#eeeeee";

export class NavigatorSplitterLayout extends Component {
   static propTypes = {
      bounding_rect: PropTypes.object.isRequired,
      frame_settings: PropTypes.object.isRequired,
      splitter_keys: PropTypes.object.isRequired,
      frame_settings_key: PropTypes.number.isRequired,
   }

   state = {
      main_splitter_pos: 1,
      legend_splitter_pos: 1,
      steps_splitter_pos: 1,
   }

   componentDidMount() {
      const {splitter_keys} = this.props
      this.setState({
         main_splitter_pos: AppSettings.get(splitter_keys.main_key),
         legend_splitter_pos: AppSettings.get(splitter_keys.legend_key),
         steps_splitter_pos: AppSettings.get(splitter_keys.steps_key),
      })
   }

   componentDidUpdate(prevProps, prevState, snapshot) {
      if (prevProps.bounding_rect.width !== this.props.bounding_rect.width) {
         this.change_steps_splitter(this.state.steps_splitter_pos)
      }
   }

   change_main_splitter = (new_position) => {
      const {bounding_rect, splitter_keys} = this.props;
      const steps_pos = AppSettings.get(splitter_keys.steps_key)
      let actual_pos = new_position
      if (new_position < bounding_rect.left + DEFAULT_SIDEBAR_WIDTH) {
         actual_pos = bounding_rect.left + DEFAULT_SIDEBAR_WIDTH
      }
      if (new_position < bounding_rect.left + steps_pos) {
         actual_pos = bounding_rect.left + steps_pos
      }
      if (new_position > bounding_rect.left + MAX_MAIN_SPLITTER_POS - 10) {
         actual_pos = bounding_rect.left + MAX_MAIN_SPLITTER_POS - 10
      }
      this.setState({main_splitter_pos: actual_pos});
      AppSettings.on_settings_changed({
         [splitter_keys.main_key]: actual_pos
      })
      // console.log(`change_main_splitter ${new_position} -> ${actual_pos}`)
   }

   change_legend_splitter = (new_position) => {
      const {bounding_rect, splitter_keys} = this.props
      let actual_pos = new_position
      if (new_position < bounding_rect.height / 2 - 10) {
         actual_pos = bounding_rect.height / 2 - 10
      }
      if (new_position > bounding_rect.height * 0.8) {
         actual_pos = bounding_rect.height * 0.8
      }
      this.setState({legend_splitter_pos: actual_pos});
      AppSettings.on_settings_changed({
         [splitter_keys.legend_key]: actual_pos
      })
      // console.log(`change_legend_splitter ${new_position} -> ${actual_pos}`)
   }

   change_steps_splitter = (new_position) => {
      const {splitter_keys} = this.props
      const {bounding_rect} = this.props;
      let actual_pos = new_position
      if (new_position < bounding_rect.left + STEPS_WIDTH_MIN_PX) {
         actual_pos = bounding_rect.left + STEPS_WIDTH_MIN_PX
      }
      if (new_position > bounding_rect.left + STEPS_WIDTH_MAX_PX) {
         actual_pos = bounding_rect.left + STEPS_WIDTH_MAX_PX
      }
      this.setState({steps_splitter_pos: actual_pos});
      AppSettings.on_settings_changed({
         [splitter_keys.steps_key]: actual_pos
      })
      // console.log(`change_steps_splitter ${new_position} -> ${actual_pos}`)
   }

   render() {
      const {main_splitter_pos, legend_splitter_pos, steps_splitter_pos} = this.state
      const {bounding_rect, splitter_keys, frame_settings, frame_settings_key} = this.props
      const legend_bounding_rect = {
         left: bounding_rect.left - 1,
         width: main_splitter_pos - bounding_rect.left - 2,
         height: 1 + bounding_rect.height,
      }
      const steps_bounding_rect = {
         width: main_splitter_pos - bounding_rect.left,
         height: 2 + legend_splitter_pos - bounding_rect.top - SPLITTER_WIDTH_PX,
      }
      const page_splitter_pos = AppSettings.get(splitter_keys.section_key)
      const all_splitters = [
         <CoolSplitter
            type={SPLITTER_TYPE_VERTICAL}
            name={'navigator-main-splitter'}
            bar_width_px={SPLITTER_WIDTH_PX}
            container_bounds={bounding_rect}
            position={main_splitter_pos}
            on_change={this.change_main_splitter}
         />,
         <CoolSplitter
            type={SPLITTER_TYPE_HORIZONTAL}
            name={'navigator-legend-splitter'}
            bar_width_px={SPLITTER_WIDTH_PX}
            container_bounds={legend_bounding_rect}
            position={legend_splitter_pos}
            on_change={this.change_legend_splitter}
         />,
         <CoolSplitter
            type={SPLITTER_TYPE_VERTICAL}
            name={'navigator-steps-splitter'}
            bar_width_px={SPLITTER_WIDTH_PX}
            container_bounds={steps_bounding_rect}
            position={steps_splitter_pos}
            on_change={this.change_steps_splitter}
         />,
      ];
      const step_pane_style = {
         top: bounding_rect.top,
         left: bounding_rect.left,
         width: steps_splitter_pos - bounding_rect.left,
         height: steps_bounding_rect.height,
         backgroundColor: STEPS_BACKGROUND_COLOR,
      }
      const field_pane_style = {
         top: bounding_rect.top,
         left: bounding_rect.left + steps_splitter_pos - page_splitter_pos,
         width: main_splitter_pos - steps_splitter_pos,
         height: steps_bounding_rect.height,
         backgroundColor: FIELD_BACKGROUND_COLOR,
         textAlign: 'center',
      }
      const legend_pane_style = {
         top: steps_bounding_rect.height + bounding_rect.top + SPLITTER_WIDTH_PX + 2,
         left: bounding_rect.left,
         width: main_splitter_pos - page_splitter_pos,
         height: bounding_rect.height - bounding_rect.top - steps_bounding_rect.height,
         backgroundColor: LEGEND_BACKGROUND_COLOR,
      }
      const all_panes = [
         <styles.FixedWrapper
            style={step_pane_style}
            key={'steps-pane'}>
            <NavigatorSteps
               bounding_rect={step_pane_style}
               frame_settings={frame_settings}
               frame_settings_key={frame_settings_key}
            />
         </styles.FixedWrapper>,
         <styles.FixedWrapper
            style={field_pane_style}
            key={'field-pane'}>
            <NavigatorField
               bounding_rect={field_pane_style}
               frame_settings={frame_settings}
               frame_settings_key={frame_settings_key}
            />
         </styles.FixedWrapper>,
         <styles.FixedWrapper
            style={legend_pane_style}
            key={'legend-pane'}>
            <NavigatorLegend
               bounding_rect={legend_pane_style}
               frame_settings={frame_settings}
               frame_settings_key={frame_settings_key}
            />
         </styles.FixedWrapper>,
      ]
      return <CoolStyles.Block>
         {all_splitters}
         {all_panes}
      </CoolStyles.Block>
   }
}

export default NavigatorSplitterLayout
