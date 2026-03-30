import React, {Component} from "react";
import PropTypes from "prop-types";

import CoolTable from "../../../utils/ui/CoolTable.jsx";
import {
   FETCH_JSON_HEADERS,
   render_magnitude,
} from "../../study/StudyUtils.jsx";
import {
   FRACTO_DATA_PORT,
   FRACTO_UI_PORT
} from "../../../../../../constants.js";

import {MainStyles as styles} from '../../../styles/MainStyles.jsx'
import AppSettings from "../../../AppSettings.jsx";
import {KEY_ASSETS_LIST_SELECTED_ROW} from "../../../settings/AssetsSettings.jsx";
import {
   CELL_ALIGN_CENTER, CELL_TYPE_CALLBACK,
   CELL_TYPE_NUMBER,
   CELL_TYPE_TEXT,
   TABLE_CAN_SELECT,
   TABLE_NO_BORDER
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import {
   KEY_COLUMN_LABEL_ASSET_ID,
   KEY_COLUMN_LABEL_ASSET_SCOPE,
} from "../../../text/AssetsText.jsx";
import {AssetsBackend} from "../../../backend/AssetsBackend.jsx";

const ASSET_ID_WIDTH_PX = 100
const SCOPE_WIDTH_PX = 120
export const GALLERY_TABLE_WIDTH_PX = ASSET_ID_WIDTH_PX
   + SCOPE_WIDTH_PX
   + 70;

const TABLE_COLUMNS = [
   {
      id: "asset_id",
      label_key: KEY_COLUMN_LABEL_ASSET_ID,
      width_px: ASSET_ID_WIDTH_PX,
      type: CELL_TYPE_TEXT,
      align: CELL_ALIGN_CENTER,
   },
   {
      id: "scope",
      label_key: KEY_COLUMN_LABEL_ASSET_SCOPE,
      width_px: SCOPE_WIDTH_PX,
      type: CELL_TYPE_CALLBACK,
      align: CELL_ALIGN_CENTER,
   },
]

export class GalleryList extends Component {
   static propTypes = {
      height_px: PropTypes.number.isRequired,
      on_select_asset: PropTypes.func.isRequired,
      ready: PropTypes.bool.isRequired,
   }
   state = {
      asset_list: [],
      selected_row: -1,
   }

   componentDidMount() {
      this.load_assets()
   }

   load_assets = async () => {
      const {on_select_asset} = this.props
      const asset_list = await AssetsBackend.load_assets()
      const selected_row = AppSettings.get(KEY_ASSETS_LIST_SELECTED_ROW)
      const selected_asset = asset_list[selected_row]
      on_select_asset(selected_asset)
      console.log('asset_list',asset_list)
      this.setState({selected_row, asset_list})
   }

   on_select_row = (row) => {
      const {asset_list} = this.state
      const {on_select_asset, ready} = this.props
      if (!ready) {
         return
      }
      const selected_asset = asset_list[row]
      this.setState({selected_row: row})
      on_select_asset(selected_asset)
      AppSettings.on_settings_changed({
         [KEY_ASSETS_LIST_SELECTED_ROW]: row
      })
   }

   render() {
      const {asset_list, selected_row} = this.state
      const {height_px, ready} = this.props
      const table_data = asset_list.map((row, index) => {
         return {
            asset_id: <styles.NumericValue>
               {row.asset_id}
            </styles.NumericValue>,
            scope: [render_magnitude, row.scope],
         }
      })
      const table_style = {
         height: `${height_px}px`,
         maxWidth: `${GALLERY_TABLE_WIDTH_PX}px`,
         cursor: ready ? 'pointer' : 'wait',
      }
      const table = <CoolTable
         columns={TABLE_COLUMNS}
         data={table_data}
         options={[TABLE_CAN_SELECT, TABLE_NO_BORDER]}
         selected_row={selected_row}
         on_select_row={this.on_select_row}
      />
      return <styles.ScrollingInlineBlock
         style={table_style}>
         {table}
      </styles.ScrollingInlineBlock>
   }
}

export default GalleryList
