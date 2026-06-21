import React, {Component} from "react";
import PropTypes from "prop-types";

import {CATEGORY_LIST_WIDTH_PX, LoreStyles as styles} from './LoreStyles.jsx'
import {AssetsBackend} from "../../../backend/AssetsBackend.jsx";
import CoolTable from "../../../utils/ui/CoolTable.jsx";
import {
   CELL_ALIGN_CENTER,
   CELL_ALIGN_LEFT,
   CELL_TYPE_CALLBACK,
   TABLE_NO_BORDER,
   TABLE_NO_HEADER,
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import {wand_icon} from "../../../utils/ui/CoolIcons.jsx";
import {new_lore_component} from "./LoreUtils.jsx";

const TABLE_COLUMNS = [
   {
      id: "category_name",
      label: 'category',
      width_px: 100,
      type: CELL_TYPE_CALLBACK,
      align: CELL_ALIGN_LEFT,
   },
   {
      id: 'new_link',
      label: 'new',
      type: CELL_TYPE_CALLBACK,
      align: CELL_ALIGN_CENTER,
   }
]

export class LoreCategoryList extends Component {
   static propTypes = {
      width_px: PropTypes.number.isRequired,
      height_px: PropTypes.number.isRequired,
      on_new_item: PropTypes.func.isRequired,
      content_width_px: PropTypes.number.isRequired,
   }

   state = {
      category_list: [],
      selected_row: -1,
   }

   componentDidMount() {
      this.get_categories()
   }

   get_categories = async () => {
      const unsorted = await AssetsBackend.lore_categories()
      const category_list = unsorted
         .sort((a, b) => a.id > b.id ? 1 : -1)
      this.setState({category_list})
   }

   on_select_row = (selected_row) => {
      this.setState({selected_row})
   }

   new_lore = (category_id) => {
      const {category_list} = this.state
      const {on_new_item, content_width_px, height_px} = this.props
      const category = category_list.find(c => c.id === category_id)
      const edit_component = new_lore_component(
         category,
         content_width_px - CATEGORY_LIST_WIDTH_PX,
         height_px)
      on_new_item(edit_component)
   }

   category_link = (id) => {
      const {category_list} = this.state
      const category = category_list.find(c => c.id === id)
      return <styles.NewLoreIcon
         onClick={() => this.new_lore(id)}
         title={`new ${category.category_name}`}
      >{wand_icon}</styles.NewLoreIcon>
   }

   category_name = (plural_name) => {
      const {category_list} = this.state
      const category = category_list.find(c => c.plural_name === plural_name)
      return <styles.CategoryTitle
         title={category.description}
      >{plural_name}</styles.CategoryTitle>
   }

   render() {
      const {category_list, selected_row} = this.state
      const {height_px, width_px} = this.props
      const table_style = {
         height: `${height_px}px`,
         width: `${width_px}px`,
         cursor: 'pointer',
         borderRight: `0.125rem solid #bbbbbb`,
      }
      const table_data = category_list.map(category => {
         return {
            'category_name': [this.category_name, category.plural_name],
            'new_link': [this.category_link, category.id],
         }
      })
      const table = <CoolTable
         columns={TABLE_COLUMNS}
         data={table_data}
         options={[TABLE_NO_HEADER, TABLE_NO_BORDER]}
         selected_row={selected_row}
         on_select_row={this.on_select_row}
      />
      return <styles.ScrollingLoreList
         style={table_style}>
         {table}
      </styles.ScrollingLoreList>
   }
}

export default LoreCategoryList
