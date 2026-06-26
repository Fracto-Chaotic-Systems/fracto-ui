import React, {Component} from "react";
import PropTypes from "prop-types";

import {
   LORE_INITIAL_DATA_STATE,
   LORE_INITIAL_META_STATE,
   render_entry_text,
   TABLE_EDITOR_COLUMNS,
} from "./ContentUtils.jsx";
import {LoreStyles as styles} from '../LoreStyles.jsx'
import {copy_json} from "../../../../utils/Dom.jsx";
import CoolTable from "../../../../utils/ui/CoolTable.jsx";
import {TABLE_NO_BORDER, TABLE_NO_HEADER} from "../../../../utils/ui/styles/CoolTableStyles.jsx";
import {render_meta} from "../LoreMetaData.jsx";
import {render_preamble} from "../LorePreamble.jsx";

export class ContentDefinition extends Component {
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

   on_entry_data_change = (entry) => {
      const {item_data} = this.state
      console.log('on_entry_data_change', entry)
      item_data.entry = entry
      this.update_item_data(item_data)
   }

   render_references = (item_data) => {
      return 'references'
   }

   render_content = () => {
      const {item_data} = this.state
      const table_data = [
         {
            edit_key: 'entry',
            edit_value: [render_entry_text, {
               item_data,
               on_entry_data_change: this.on_entry_data_change,
            }]
         },
         {
            edit_key: 'refs',
            edit_value: [this.render_references, {
               item_data,
            }]
         },
      ]
      return <CoolTable
         columns={TABLE_EDITOR_COLUMNS}
         data={table_data}
         options={[TABLE_NO_HEADER, TABLE_NO_BORDER]}
      />
   }

   render() {
      const {item_data, meta_data} = this.state
      const {category} = this.props
      console.log('ContentDefinition item_data, meta_data', item_data, meta_data)
      const preamble = render_preamble(
         item_data, category, this.update_item_data)
      const content = this.render_content()
      const meta = render_meta(
         meta_data, item_data, category, this.update_meta_data)
      return <styles.ScrollingLoreList>
         {preamble}
         {content}
         {meta}
      </styles.ScrollingLoreList>
   }
}

export default ContentDefinition
