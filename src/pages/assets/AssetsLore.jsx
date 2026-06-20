import React, {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import {KEY_ASSETS_LORE} from "../../text/AssetsText.jsx";
import {KEY_STUDY_SPLITTER_POS_PX} from "../../settings/StudySettings.jsx";
import {update_dimensions} from "../PageUtils.jsx"
import LoreCategoryList from "./lore/LoreCategoryList.jsx";
import {CATEGORY_LIST_WIDTH_PX} from "./lore/LoreStyles.jsx";

const UPDATE_INTERVAL_MS = 1000

export class AssetsLore extends Component {

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
      const {interval, subscription} = this.state
      if (interval) {
         clearInterval(interval)
      }
   }

   update_dimensions = () => {
      const {rendered_width, rendered_height} = this.state;
      const new_values = update_dimensions(rendered_width, rendered_height, KEY_STUDY_SPLITTER_POS_PX)
      if (new_values) {
         this.setState(new_values)
      }
   }

   render() {
      const {rendered_height} = this.state
      return [
         <styles.SectionTitle
            key={'assets-status-title'}>
            {AppText.get(KEY_ASSETS_LORE)}
         </styles.SectionTitle>,
         <styles.BodyWrapper
            key={'input-form'}>
            <LoreCategoryList
               height_px={rendered_height}
               width_px={CATEGORY_LIST_WIDTH_PX}
            />
         </styles.BodyWrapper>,
      ];
   }
}

export default AssetsLore
