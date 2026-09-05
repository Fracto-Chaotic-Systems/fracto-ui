import React, {Component} from "react";
import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import {KEY_ASSETS_LORE_STYLES} from "../../text/AssetsText.jsx";
import {KEY_STUDY_SPLITTER_POS_PX} from "../../settings/StudySettings.jsx";
import {update_dimensions} from "../PageUtils.jsx";

const UPDATE_INTERVAL_MS = 1000

/** Initial scaffold for shared styling controls used by the lore section. */
export class AssetsLoreStyles extends Component {
   state = {
      rendered_width: 0,
      rendered_height: 0,
      interval: null,
   }

   componentDidMount() {
      this.update_dimensions()
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
      if (new_values) this.setState(new_values)
   }

   render() {
      return [
         <styles.SectionTitle key={'assets-lore-styles-title'}>
            {AppText.get(KEY_ASSETS_LORE_STYLES)}
         </styles.SectionTitle>,
         <styles.BodyWrapper key={'assets-lore-styles-body'} />,
      ]
   }
}

export default AssetsLoreStyles
