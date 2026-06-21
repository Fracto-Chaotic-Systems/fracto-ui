import React, {Component} from "react";
import PropTypes from "prop-types";

import {render_preamble} from "./ContentUtils.jsx";
import {LoreStyles as styles} from '../LoreStyles.jsx'

export class ContentDiagram extends Component {
   static propTypes = {
      item_id: PropTypes.number.isRequired,
      category: PropTypes.object.isRequired,
      width_px: PropTypes.number.isRequired,
      height_px: PropTypes.number.isRequired,
   }

   state = {
      item_data: {
         edit_key: "-1",
         title: "use your words",
      }
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
      const {item_data} = this.state
      const {category} = this.props
      const preamble = render_preamble(
         item_data, category, this.on_update_data)
      return <styles.ScrollingLoreList>
         {preamble}
      </styles.ScrollingLoreList>
   }
}

export default ContentDiagram
