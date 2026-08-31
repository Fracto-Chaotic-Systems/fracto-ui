import React, {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import AppText from "../../AppText.jsx";
import CoolTabs from "../../utils/ui/CoolTabs.jsx";
import {CoolStyles} from "../../utils/ui/CoolImports.jsx";
import {KEY_DATA_CONTENT_QUERIES, KEY_DATA_QUERY_TABLE_ASSETS, KEY_DATA_QUERY_TABLE_FREE_BAILIWICKS, KEY_DATA_QUERY_TABLE_LORE_CATEGORY, KEY_DATA_QUERY_TABLE_LORE_FILES, KEY_DATA_QUERY_TABLE_TILES} from "../../text/DataText.jsx";
import AppSettings from "../../AppSettings.jsx";
import {KEY_DATA_QUERIES_TAB, KEY_DATA_SPLITTER_POS_PX} from "../../settings/DataSettings.jsx";
import {BACKGROUND_FIELD_GRADIENT} from "../../constants.jsx";
import {update_dimensions} from "../PageUtils.jsx";

const TABLE_TABS = [
   KEY_DATA_QUERY_TABLE_ASSETS,
   KEY_DATA_QUERY_TABLE_FREE_BAILIWICKS,
   KEY_DATA_QUERY_TABLE_LORE_CATEGORY,
   KEY_DATA_QUERY_TABLE_LORE_FILES,
   KEY_DATA_QUERY_TABLE_TILES,
]

export class AdminQueries extends Component {
   state = {
      tab_index: 0,
      rendered_width: 0,
      rendered_height: 0,
      dimensions_interval: null,
      field_ref: React.createRef(),
   }

   componentDidMount() {
      const saved_tab = AppSettings.get(KEY_DATA_QUERIES_TAB)
      const tab_index = Number.isInteger(saved_tab) && saved_tab >= 0 && saved_tab < TABLE_TABS.length ? saved_tab : 0
      this.setState({tab_index})
      this.update_dimensions()
      this.setState({dimensions_interval: setInterval(this.update_dimensions, 1000)})
   }

   componentWillUnmount() {
      if (this.state.dimensions_interval) clearInterval(this.state.dimensions_interval)
      this.unmounted = true
   }

   update_dimensions = () => {
      const {rendered_width, rendered_height} = this.state
      const new_values = update_dimensions(rendered_width, rendered_height, KEY_DATA_SPLITTER_POS_PX)
      if (new_values && !this.unmounted) this.setState(new_values)
   }

   on_tab_select = tab_index => {
      AppSettings.on_settings_changed({[KEY_DATA_QUERIES_TAB]: tab_index})
      this.setState({tab_index})
   }

   render() {
      const {tab_index, rendered_height, field_ref} = this.state
      const labels = TABLE_TABS.map(key => AppText.get(key))
      const selected_content = <CoolStyles.Block style={{backgroundColor: 'white', minHeight: '12rem'}} />
      const field_top = field_ref.current?.getBoundingClientRect()?.top || 0
      const field_height = rendered_height ? Math.max(0, rendered_height - field_top) : undefined
      return <styles.PaneWrapper>
         <styles.SectionTitle>
            {AppText.get(KEY_DATA_CONTENT_QUERIES)}
         </styles.SectionTitle>
         <CoolStyles.Block
            ref={field_ref}
            style={{
               background: BACKGROUND_FIELD_GRADIENT,
               height: field_height ? `${field_height}px` : 'auto',
               overflowY: 'auto',
            }}>
            <CoolTabs
               labels={labels}
               tab_index={tab_index}
               on_tab_select={this.on_tab_select}
               selected_content={selected_content}
            />
         </CoolStyles.Block>
      </styles.PaneWrapper>
   }
}

export default AdminQueries
