import React, {Component} from "react";

import MinibrotPanel from "./minibrots/MinibrotPanel.jsx";

import {
   MainStyles as styles,
   MARGIN_PX,
   TITLE_BAR_HEIGHT_PX
} from '../../styles/MainStyles.jsx'
import AppSettings from "../../AppSettings.jsx";
import {KEY_STUDY_SPLITTER_POS_PX} from "../../settings/StudySettings.jsx";
import {KEY_VIEWPORT_DIMENSIONS} from "../../settings/RootSettings.jsx";
import AppText from "../../AppText.jsx";
import {KEY_STUDY_MINIBROTS} from "../../text/StudyText.jsx";

const UPDATE_INTERVAL_MS = 1000

export class StudyMinibrots extends Component {
   state = {
      rendered_width: 0,
      rendered_height: 0,
      container_ref: React.createRef(),
      interval: null,
   }

   componentDidMount() {
      this.update_dimensions()
      this.setState({
         interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
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
      const viewport_dimensions = AppSettings.get(KEY_VIEWPORT_DIMENSIONS)
      const splitter_width = AppSettings.get(KEY_STUDY_SPLITTER_POS_PX)
      const rendered_width_changed = rendered_width !== viewport_dimensions.width - splitter_width
      const rendered_height_changed = rendered_height !== viewport_dimensions.height
      if (rendered_height_changed || rendered_width_changed) {
         this.setState({
            rendered_width: viewport_dimensions.width - splitter_width,
            rendered_height: viewport_dimensions.height,
         })
      }
   }

   render() {
      const {rendered_height, container_ref} = this.state
      let top = 0;
      let container_bounds = {}
      if (container_ref.current) {
         container_bounds = container_ref.current.getBoundingClientRect()
         top = container_bounds.top
      }
      const list_height_px = rendered_height - 2 * MARGIN_PX - top + TITLE_BAR_HEIGHT_PX
      return [
         <styles.SectionTitle
            key={'study-minibrots-title'}>
            {AppText.get(KEY_STUDY_MINIBROTS)}
         </styles.SectionTitle>,
         <div ref={container_ref}>
            <MinibrotPanel
               height_px={list_height_px}
            />
         </div>
      ];
   }
}

export default StudyMinibrots
