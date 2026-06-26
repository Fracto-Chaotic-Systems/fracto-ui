import React, {Component} from "react";
import PropTypes from "prop-types";

import {
   LORE_INITIAL_DATA_STATE,
   LORE_INITIAL_META_STATE,
} from "./ContentUtils.jsx";
import {LoreStyles as styles} from '../LoreStyles.jsx'
import {copy_json} from "../../../../utils/Dom.jsx";
import {render_meta} from "../LoreMetaData.jsx";
import {render_preamble} from "../LorePreamble.jsx";

export class ContentSubject extends Component {
   static propTypes = {
      item_id: PropTypes.number.isRequired,
      category: PropTypes.object.isRequired,
      width_px: PropTypes.number.isRequired,
      height_px: PropTypes.number.isRequired,
   }

   state = {
      item_data: copy_json(LORE_INITIAL_DATA_STATE),
      meta_data: copy_json(LORE_INITIAL_META_STATE),
   }

   update_item_data = (item_data) => {
      const {meta_data} = this.state
      meta_data.can_store = true;
      meta_data.modified = item_data.modified;
      this.setState({item_data, meta_data})
   }

   update_meta_data = (meta_data) => {
      this.setState({meta_data})
   }

   render() {
      const {item_data, meta_data} = this.state
      const {category} = this.props
      console.log('item_data, meta_data', item_data, meta_data)
      const preamble = render_preamble(
         item_data, category, this.update_item_data)
      const meta = render_meta(
         meta_data, item_data, category, this.update_meta_data)
      return <styles.ScrollingLoreList>
         {preamble}
         {meta}
      </styles.ScrollingLoreList>
   }
}

export default ContentSubject
