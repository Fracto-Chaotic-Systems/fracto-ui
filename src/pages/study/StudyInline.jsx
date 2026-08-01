import React, {Component} from "react";

import NavigatorSplitterLayout from "../../navigator/NavigatorSplitterLayout.jsx";

import {MainStyles as styles, MARGIN_PX} from '../../styles/MainStyles.jsx'
import AppSettings from "../../AppSettings.jsx";
import {KEY_VIEWPORT_DIMENSIONS} from "../../settings/RootSettings.jsx";
import {
   KEY_STUDY_NODES_FRAME_SETTINGS,
   KEY_STUDY_NODES_SPLITTER_POS,
} from "../../settings/StudySettings.jsx";
import AppText from "../../AppText.jsx";
import {
   KEY_STUDY_INLINES,
   KEY_STUDY_NODES,
} from "../../text/StudyText.jsx";
import {STUDY_NODES_SPLITTER_KEYS} from "../../navigator/NavigatorKeys.jsx";

const UPDATE_INTERVAL_MS = 1000

export class StudyInline extends Component {

   state = {
      rendered_width: 0,
      rendered_height: 0,
      interval: null,
      container_ref: React.createRef(),
      frame_settings: {},
      subscription: null,
   }

   componentDidMount() {
      const frame_settings = AppSettings
         .get(STUDY_NODES_SPLITTER_KEYS.frame_settings_key)
      this.setState({
         frame_settings,
         interval: setInterval(
            this.update_dimensions,
            UPDATE_INTERVAL_MS),
         subscription: AppSettings.subscribe(
            STUDY_NODES_SPLITTER_KEYS.frame_settings_key,
            this.on_frame_settings_changed)
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

   on_frame_settings_changed = async (key, value) => {
      this.setState({frame_settings: value})
   }

   update_dimensions = () => {
      const {rendered_width, rendered_height} = this.state;
      const {on_resize} = this.props
      const viewport_dimensions = AppSettings.get(KEY_VIEWPORT_DIMENSIONS)
      const splitter_width = AppSettings.get(STUDY_NODES_SPLITTER_KEYS.section_key)
      const rendered_width_changed = rendered_width !== viewport_dimensions.width - splitter_width
      const rendered_height_changed = rendered_height !== viewport_dimensions.height
      if (rendered_height_changed || rendered_width_changed) {
         this.setState({
            rendered_width: viewport_dimensions.width - splitter_width,
            rendered_height: viewport_dimensions.height,
         })
      }
      if (on_resize) {
         on_resize(rendered_width, rendered_height)
      }
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
      const splitter_pos = AppSettings.get(KEY_STUDY_NODES_SPLITTER_POS)
      const right_block_style = {
         left: `${splitter_pos + MARGIN_PX}px`,
         top: `${top + MARGIN_PX}px`,
      }
      return [
         <styles.SectionTitle
            key={'study-overview-title'}>
            {AppText.get(KEY_STUDY_INLINES)}
         </styles.SectionTitle>,
         <styles.TightCenteredBlock
            ref={container_ref}
            key={'generator-content'}>
            <NavigatorSplitterLayout
               bounding_rect={bounding_rect}
               frame_settings={frame_settings}
               frame_settings_key={KEY_STUDY_NODES_FRAME_SETTINGS}
               splitter_keys={STUDY_NODES_SPLITTER_KEYS}
            />
         </styles.TightCenteredBlock>,
      ];
   }
}

export default StudyInline
