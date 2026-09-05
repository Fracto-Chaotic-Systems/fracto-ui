import React, {Component} from "react";
import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import AppSettings from "../../AppSettings.jsx";
import {KEY_ASSETS_LORE_STYLES} from "../../text/AssetsText.jsx";
import {KEY_STUDY_SPLITTER_POS_PX} from "../../settings/StudySettings.jsx";
import {update_dimensions} from "../PageUtils.jsx";
import CoolSplitter, {SPLITTER_TYPE_HORIZONTAL} from "../../utils/ui/CoolSplitter.jsx";
import CoolStyles from "../../utils/ui/styles/CoolStyles.jsx";
import {SPLITTER_WIDTH_PX} from "../../constants.jsx";
import {KEY_ASSETS_LORE_STYLES_OUTERMOST_SPLITTER_POS_PX} from "../../settings/AssetsSettings.jsx";

const UPDATE_INTERVAL_MS = 1000
const PHI = (1 + Math.sqrt(5)) / 2

/** Initial scaffold for shared styling controls used by the lore section. */
export class AssetsLoreStyles extends Component {
   state = {
      rendered_width: 0,
      rendered_height: 0,
      interval: null,
      splitter_position: 0,
      container_ref: React.createRef(),
      container_bounds: {},
   }

   componentDidMount() {
      this.update_dimensions()
      const saved_position = AppSettings.get(KEY_ASSETS_LORE_STYLES_OUTERMOST_SPLITTER_POS_PX)
      this.setState({splitter_position: saved_position})
      this.setState({
         interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
      })
   }

   componentWillUnmount() {
      if (this.state.interval) clearInterval(this.state.interval)
   }

   update_dimensions = () => {
      const {rendered_width, rendered_height} = this.state
      const new_values = update_dimensions(rendered_width, rendered_height, KEY_STUDY_SPLITTER_POS_PX)
      if (new_values) {
         const splitter_position = this.state.splitter_position || new_values.rendered_height / PHI
         this.setState({
            ...new_values,
            splitter_position,
            container_bounds: {left: 0, top: 0, width: new_values.rendered_width, height: new_values.rendered_height},
         })
      }
   }

   on_splitter_change = position => {
      this.setState({splitter_position: position})
      AppSettings.on_settings_changed({[KEY_ASSETS_LORE_STYLES_OUTERMOST_SPLITTER_POS_PX]: position})
   }

   render() {
      const {rendered_width, rendered_height, splitter_position, container_ref, container_bounds} = this.state
      const top_height = Math.max(0, splitter_position)
      const bottom_height = Math.max(0, rendered_height - top_height)
      return [
         <styles.SectionTitle key={'assets-lore-styles-title'}>
            {AppText.get(KEY_ASSETS_LORE_STYLES)}
         </styles.SectionTitle>,
         <styles.BodyWrapper key={'assets-lore-styles-body'} ref={container_ref} style={{position: 'relative', width: `${rendered_width}px`, height: `${rendered_height}px`}}>
            <CoolStyles.Block style={{height: `${top_height}px`, overflow: 'hidden'}} />
            <CoolStyles.Block style={{height: `${bottom_height}px`, overflow: 'hidden'}} />
            <CoolSplitter type={SPLITTER_TYPE_HORIZONTAL} name={KEY_ASSETS_LORE_STYLES_OUTERMOST_SPLITTER_POS_PX} bar_width_px={SPLITTER_WIDTH_PX} container_bounds={container_bounds} position={splitter_position} on_change={this.on_splitter_change} />
         </styles.BodyWrapper>,
      ]
   }
}

export default AssetsLoreStyles
