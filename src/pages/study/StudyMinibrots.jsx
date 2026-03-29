import React, {Component} from "react";

import {
   FRACTO_DATA_PORT,
   FRACTO_UI_PORT
} from "../../../../../constants.js";
import CoolTable from "../../utils/ui/CoolTable.jsx";
import {
   render_magnitude,
   render_pattern_block
} from "./StudyUtils.jsx";
import FractoRasterImage from "../../utils/render/FractoRasterImage.jsx";

import {
   MainStyles as styles,
   MARGIN_PX,
   TITLE_BAR_HEIGHT_PX
} from '../../styles/MainStyles.jsx'
import {
   CELL_ALIGN_CENTER,
   CELL_TYPE_CALLBACK,
   TABLE_CAN_SELECT,
   TABLE_NO_BORDER
} from "../../utils/ui/styles/CoolTableStyles.jsx";
import AppSettings from "../../AppSettings.jsx";
import {
   KEY_STUDY_MINIBROTS_RENDER_SPLITTER_POS,
   KEY_STUDY_MINIBROTS_SELECTED_ROW,
   KEY_STUDY_SPLITTER_POS_PX
} from "../../settings/StudySettings.jsx";
import {KEY_VIEWPORT_DIMENSIONS} from "../../settings/RootSettings.jsx";
import AppText from "../../AppText.jsx";
import {
   KEY_STUDY_CARDINAL,
   KEY_STUDY_MAGNITUDE,
   KEY_STUDY_MINIBROTS
} from "../../text/StudyText.jsx";
import CoolSplitter, {
   SPLITTER_TYPE_VERTICAL
} from "../../utils/ui/CoolSplitter.jsx";
import {SPLITTER_WIDTH_PX} from "../../constants.jsx";
import FractoOrbitalChart from "../../utils/render/FractoOrbitalChart.jsx";

const FETCH_JSON_HEADERS = {
   'Content-Type': 'application/json',
   'Accept': 'application/json'
}

const UPDATE_INTERVAL_MS = 1000
const CARDINAL_WIDTH_PX = 50
const MAGNITUDE_WIDTH_PX = 120
const TABLE_WIDTH_PX =
   CARDINAL_WIDTH_PX
   + MAGNITUDE_WIDTH_PX
   + 70;

const TABLE_COLUMNS = [
   {
      id: "cardinality",
      label_key: KEY_STUDY_CARDINAL,
      width_px: CARDINAL_WIDTH_PX,
      type: CELL_TYPE_CALLBACK,
      align: CELL_ALIGN_CENTER,
   },
   {
      id: "magnitude",
      label_key: KEY_STUDY_MAGNITUDE,
      width_px: MAGNITUDE_WIDTH_PX,
      type: CELL_TYPE_CALLBACK,
      align: CELL_ALIGN_CENTER,
   },
]
const IMAGE_SIZE_DELTA = 50

export class StudyMinibrots extends Component {
   state = {
      rendered_width: 0,
      rendered_height: 0,
      container_ref: React.createRef(),
      interval: null,
      minibrot_list: [],
      selected_row: -1,
      selected_minibrot: {},
      rendered_splitter_pos: 500,
      display_settings: {},
      core_point: {},
      ready: false,
   }

   componentDidMount() {
      this.load_minibrots()
      this.update_dimensions()
      this.setState({
         rendered_splitter_pos: AppSettings.get(KEY_STUDY_MINIBROTS_RENDER_SPLITTER_POS),
         selected_row: AppSettings.get(KEY_STUDY_MINIBROTS_SELECTED_ROW),
         interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
      })
   }

   componentWillUnmount() {
      const {interval} = this.state
      if (interval) {
         clearInterval(interval)
      }
   }

   load_minibrots = async () => {
      const origin = window.origin.replace(`${FRACTO_UI_PORT}`, `${FRACTO_DATA_PORT}`)
      const url = `${origin}/minibrots`
      console.log('url', url)
      const fetched = await fetch(url, FETCH_JSON_HEADERS).then(res => {
         return res.json()
      })
      const minibrot_list = fetched.result
      const selected_row = AppSettings.get(KEY_STUDY_MINIBROTS_SELECTED_ROW)
      const selected_minibrot = minibrot_list[selected_row]
      const display_settings = JSON.parse(selected_minibrot.display_settings)
      const core_point = JSON.parse(selected_minibrot.core_point)
      // console.log('minibrot_list', result)
      this.setState({
         minibrot_list,
         selected_minibrot,
         display_settings,
         core_point,
      })
   }

   on_select_row = (row) => {
      const {minibrot_list, ready} = this.state
      if (!ready) {
         return
      }
      const selected_minibrot = minibrot_list[row]
      const display_settings = JSON.parse(selected_minibrot.display_settings)
      const core_point = JSON.parse(selected_minibrot.core_point)
      this.setState({
         selected_row: row,
         selected_minibrot,
         display_settings,
         core_point,
         ready: false,
      })
      AppSettings.on_settings_changed({
         [KEY_STUDY_MINIBROTS_SELECTED_ROW]: row
      })
   }

   on_ready = () => {
      this.setState({ready: true})
   }

   update_dimensions = () => {
      const {rendered_width, rendered_height} = this.state;
      const viewport_dimensions = AppSettings.get(KEY_VIEWPORT_DIMENSIONS)
      const splitter_width = AppSettings.get(KEY_STUDY_SPLITTER_POS_PX)
      const rendered_width_changed = rendered_width !== viewport_dimensions.width - splitter_width
      const rendered_height_changed = rendered_height !== viewport_dimensions.height
      if (rendered_height_changed || rendered_width_changed) {
         this.setState({
            rendered_width: viewport_dimensions.width - splitter_width,
            rendered_height: viewport_dimensions.height,
         })
      }
   }

   change_splitter_pos = (pos) => {
      const {container_ref} = this.state
      if (container_ref.current) {
         const container_bounds = container_ref.current.getBoundingClientRect()
         if (pos < (container_bounds.left + TABLE_WIDTH_PX)) {
            return;
         }
         if (pos > (container_bounds.left + TABLE_WIDTH_PX + container_bounds.height / 2)) {
            return;
         }
      }
      AppSettings.on_settings_changed({
         [KEY_STUDY_MINIBROTS_RENDER_SPLITTER_POS]: pos
      })
      this.setState({rendered_splitter_pos: pos})
   }

   left_panel = () => {
      const {
         core_point, ready,
         container_ref, rendered_splitter_pos, selected_minibrot, display_settings,
      } = this.state
      if (!selected_minibrot.pattern) {
         return []
      }
      if (!display_settings.focal_point) {
         return []
      }
      let top = 0;
      let left = 0;
      let container_bounds = {}
      if (container_ref.current) {
         container_bounds = container_ref.current.getBoundingClientRect()
         top = container_bounds.top
         left = container_bounds.left
      }
      const study_splitter_pos = AppSettings.get(KEY_STUDY_SPLITTER_POS_PX)
      const width = rendered_splitter_pos - study_splitter_pos - TABLE_WIDTH_PX - SPLITTER_WIDTH_PX
      const width_px = Math
         .floor(width / IMAGE_SIZE_DELTA) * IMAGE_SIZE_DELTA
      const margin = (width - width_px) / 2
      const panel_style = {
         top: `${top}px`,
         left: `${left + TABLE_WIDTH_PX}px`,
         width: `${width}px`,
         height: `${container_bounds.height}px`,
         backgroundColor: '#e4e4e4',
      }
      const image_style = {
         margin: `${margin}px auto`,
         width: `${width_px}px`,
         height: `${width_px}px`,
         boxShadow: '5px 5px 10px rgba(0, 0, 0, 0.25)',
         backgroundColor: '#f8f8f8',
         cursor: ready ? 'crosshair' : 'wait',
      }
      // console.log("width_px, display_settings", width_px, display_settings)
      return <styles.FixedInlineBlock
         style={panel_style}>
         <div style={image_style}>
            <FractoRasterImage
               width_px={width_px}
               focal_point={display_settings.focal_point}
               scope={display_settings.scope}
               on_plan_complete={this.on_ready}
            />
         </div>
         <div style={image_style}>
            <FractoOrbitalChart
               width_px={width_px}
               focal_point={core_point}
            />
         </div>
      </styles.FixedInlineBlock>
   }

   right_panel = () => {
      return 'right_panel'
   }

   render() {
      const {
         rendered_height, container_ref, rendered_splitter_pos,
         minibrot_list, selected_row, ready,
      } = this.state
      let top = 0;
      let left = 0;
      let container_bounds = {}
      if (container_ref.current) {
         container_bounds = container_ref.current.getBoundingClientRect()
         top = container_bounds.top
         left = container_bounds.left
      }
      const table_data = minibrot_list.map((row, index) => {
         return {
            cardinality: [render_pattern_block, row.pattern],
            magnitude: [render_magnitude, row.magnitude],
         }
      })
      const table = <CoolTable
         columns={TABLE_COLUMNS}
         data={table_data}
         options={[TABLE_CAN_SELECT, TABLE_NO_BORDER]}
         selected_row={selected_row}
         on_select_row={this.on_select_row}
      />
      const table_style = {
         height: `${rendered_height - 2 * MARGIN_PX - top + TITLE_BAR_HEIGHT_PX}px`,
         maxWidth: `${TABLE_WIDTH_PX}px`,
         cursor: ready ? 'pointer' : 'wait',
      }
      // console.log('selected_minibrot', selected_minibrot)
      const left_panel = this.left_panel()
      const right_panel = this.right_panel()
      return [
         <styles.SectionTitle
            key={'study-minibrots-title'}>
            {AppText.get(KEY_STUDY_MINIBROTS)}
         </styles.SectionTitle>,
         <styles.TightCenteredBlock
            ref={container_ref}>
            <styles.ScrollingBlock
               style={table_style}
               key={'input-form'}>
               {table}
               {left_panel}
               <CoolSplitter
                  type={SPLITTER_TYPE_VERTICAL}
                  name={'minibrots-main-splitter'}
                  bar_width_px={SPLITTER_WIDTH_PX}
                  container_bounds={container_bounds}
                  position={rendered_splitter_pos}
                  on_change={this.change_splitter_pos}
               />
               {right_panel}
            </styles.ScrollingBlock>
         </styles.TightCenteredBlock>
      ];
   }
}

export default StudyMinibrots
