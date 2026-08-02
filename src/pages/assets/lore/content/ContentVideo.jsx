import React, {Component} from "react";
import PropTypes from "prop-types";

import {LoreStyles as styles} from '../LoreStyles.jsx'
import {copy_json} from "../../../../utils/Dom.jsx";
import {render_meta} from "../LoreMetaData.jsx";
import {render_preamble} from "../LorePreamble.jsx";
import {AssetsBackend} from "../../../../backend/AssetsBackend.jsx";

export class ContentVideo extends Component {
   static propTypes = {
      item_id: PropTypes.number.isRequired,
      category: PropTypes.object.isRequired,
      width_px: PropTypes.number.isRequired,
      height_px: PropTypes.number.isRequired,
   }

   state = {
      content: null,
   }

   componentDidMount() {
      this.load_content()
   }

   load_content = async () => {
      const {item_id} = this.props
      const content = await AssetsBackend.get_lore_content(item_id)
      this.setState({content})
   }

   update_item_data = (content_data) => {
      const {content} = this.state
      const {content_meta} = content
      content_meta.can_store = true;
      content_meta.modified = content_data.modified;
      content.content_data = copy_json(content_data)
      this.setState({content})
   }

   update_meta_data = (content_meta) => {
      const {content} = this.state
      content.content_meta = copy_json(content_meta)
      this.setState({content})
   }

   render() {
      const {content} = this.state
      const {category} = this.props
      if (!content) {
         console.log('content null', content)
         return []
      }
      const {content_data, content_meta} = content
      if (!content_data) {
         console.log('content_data null', content)
         return []
      }
      const preamble_section = render_preamble(
          content, category, this.update_item_data)
      const meta_section = render_meta(
          content_meta, content_data, category, this.update_meta_data)
      return <styles.ScrollingLoreList>
         {preamble_section}
         {meta_section}
      </styles.ScrollingLoreList>
   }
}

export default ContentVideo
