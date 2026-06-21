import React, {Component} from "react";
import PropTypes from "prop-types";

import {LORE_INITIAL_STATE, render_meta, render_preamble} from "./ContentUtils.jsx";
import {LoreStyles as styles} from '../LoreStyles.jsx'
import {copy_json} from "../../../../utils/Dom.jsx";

export class ContentVideo extends Component {
   static propTypes = {
      item_id: PropTypes.number.isRequired,
      category: PropTypes.object.isRequired,
      width_px: PropTypes.number.isRequired,
      height_px: PropTypes.number.isRequired,
   }

   state = {
      ...copy_json(LORE_INITIAL_STATE),
   }

   on_update_data = (obj) => {
      const {item_data} = this.state
      // console.log('on_update_data', item_data)
      if (obj.edit_key) {
         item_data.edit_key = obj.edit_key
      }
      if (obj.title) {
         item_data.title = obj.title
      }
      this.setState({item_data})
   }

   render() {
      const {item_data, meta_data} = this.state
      const {category} = this.props
      const preamble = render_preamble(
         item_data, category, this.on_update_data)
      const meta = render_meta(
         meta_data, this.on_update_meta)
      return <styles.ScrollingLoreList>
         {preamble}
         {meta}
      </styles.ScrollingLoreList>
   }
}

export default ContentVideo
