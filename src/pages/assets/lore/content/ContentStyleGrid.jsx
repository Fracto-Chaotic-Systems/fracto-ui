import React, {Component} from "react";
import PropTypes from "prop-types";
import AssetsBackend from "../../../../backend/AssetsBackend.jsx";

import CoolTable from "../../../../utils/ui/CoolTable.jsx";
import {
   CELL_ALIGN_LEFT,
   CELL_ALIGN_RIGHT,
   CELL_TYPE_CALLBACK, TABLE_CAN_SELECT,
   TABLE_NO_HEADER
} from "../../../../utils/ui/styles/CoolTableStyles.jsx";

const TABLE_COLUMNS = [
   {
      id: "key",
      width_px: '15rem',
      type: CELL_TYPE_CALLBACK,
      align: CELL_ALIGN_RIGHT,
   },
   {
      id: "value",
      width_px: '25rem',
      type: CELL_TYPE_CALLBACK,
      align: CELL_ALIGN_LEFT,
   },
]

export class ContentStyleGrid extends Component {
   static propTypes = {
      style_list: PropTypes.array.isRequired,
      on_style_list_changed: PropTypes.func.isRequired,
   }
   
   state = {
      loading: true,
      properties: {},
      property_keys: [],
      selected_row: 0,
   }
   
   componentDidMount() {
      this.load_properties()
   }
   
   load_properties() {
      AssetsBackend.load_style_properties()
         .then((properties) => {
            console.log('properties', properties);
            this.setState({
               loading: false,
               properties: properties,
               property_keys: Object.keys(properties),
            });
         })
         .catch((err) => {
            console.log('properties error', err.message);
            this.setState({loading: false, error: err.message});
         });
   }
   
   on_select_row = (selected_row) => {
      this.setState({selected_row});
   }
   
   render_key = ({item, index}) => {
      return `key_${index}`;
   }
   
   render_value = ({item, index}) => {
      return `value_${index}`;
   }
   
   render() {
      const {style_list} = this.props;
      if (!style_list) {
         return []
      }
      const table_data = style_list.map((item, index) => {
         return {
            key: [this.render_key, {item, index}],
            value: [this.render_value, {item, index}]
         }
      })
      return <CoolTable
         columns={TABLE_COLUMNS}
         data={style_list}
         on_select_row={this.on_select_row}
         options={[TABLE_NO_HEADER, TABLE_CAN_SELECT]}
      />
   }
}

export default ContentStyleGrid
