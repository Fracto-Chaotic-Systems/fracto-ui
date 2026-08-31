import React, {Component} from "react";
import PropTypes from "prop-types";

import {CATEGORY_LIST_WIDTH_PX, LoreStyles as styles} from './LoreStyles.jsx'
import CoolTable from "../../../utils/ui/CoolTable.jsx";
import {
   CELL_ALIGN_CENTER,
   CELL_ALIGN_LEFT,
   CELL_TYPE_CALLBACK,
   TABLE_NO_BORDER,
   TABLE_NO_HEADER,
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import {wand_icon} from "../../../utils/ui/CoolIcons.jsx";
import {
   new_lore_component,
   get_categories,
   get_category} from "./LoreUtils.jsx";
import {BACKGROUND_FIELD_GRADIENT} from "../../../constants.jsx";
import AppSettings from "../../../AppSettings.jsx";
import {KEY_ASSETS_LORE_SELECTED_CATEGORY_ID} from "../../../settings/AssetsSettings.jsx";

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
      on_select_category: PropTypes.func.isRequired,
      on_new_item: PropTypes.func.isRequired,
      content_width_px: PropTypes.number.isRequired,
   }
   
   state = {
      category_list: [],
      selected_row: -1,
      selected_category_id: -1,
      selected_category: null,
   }
   
   componentDidMount() {
      this.get_category_list()
   }
   
   get_category_list = async () => {
      const category_list = await get_categories()
      this.setState({category_list})
      const selected_category_id = AppSettings.get(KEY_ASSETS_LORE_SELECTED_CATEGORY_ID)
      this.setState({selected_category_id})
   }
   
   on_select_row = (selected_row) => {
      this.setState({selected_row})
   }
   
   new_lore = async (category_id) => {
      const {on_new_item, content_width_px, height_px} = this.props
      const category = await get_category(category_id)
      const edit_component = new_lore_component(
         category,
         content_width_px - CATEGORY_LIST_WIDTH_PX,
         height_px)
      on_new_item(edit_component)
   }
   
   category_name = (plural_name) => {
      const {category_list, selected_category_id} = this.state
      const category = category_list.find(c => c.plural_name === plural_name)
      const is_selected = selected_category_id === category.id
      const title_style = is_selected ? {fontWeight: 'bold'} : {}
      return <styles.CategoryTitle
         style={title_style}
         onClick={() => this.on_select_category(category)}
         title={category.description}
      >{plural_name}</styles.CategoryTitle>
   }
   
   category_link = (id) => {
      const {category_list, selected_category_id} = this.state
      const category = category_list.find(c => c.id === id)
      const is_selected = selected_category_id === category.id
      const icon_style = is_selected ? {fill: 'black'} : {}
      return <styles.NewLoreIcon
         style={icon_style}
         onClick={() => this.new_lore(id)}
         title={`new ${category.category_name}`}
      >{wand_icon}</styles.NewLoreIcon>
   }
   
   on_select_category = (category) => {
      const {on_select_category} = this.props
      this.setState({
         selected_category: category,
         selected_category_id: category.id,
      })
      console.log('on_select_category', category)
      AppSettings.on_settings_changed({
         [KEY_ASSETS_LORE_SELECTED_CATEGORY_ID]: category.id
      })
      on_select_category(category)
   }
   
   render() {
      const {category_list, selected_row} = this.state
      const {height_px, width_px} = this.props
      // console.log('category_list', category_list)
      const table_style = {
         height: `${height_px}px`,
         width: `${width_px}px`,
         cursor: 'pointer',
         borderRight: `0.125rem solid #bbbbbb`,
         background: BACKGROUND_FIELD_GRADIENT,
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
