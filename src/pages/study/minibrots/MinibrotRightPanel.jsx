import React, {Component} from "react";
import PropTypes from "prop-types";

import {MainStyles as styles,} from '../../../styles/MainStyles.jsx'
import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";
import AppSettings from "../../../AppSettings.jsx";
import {
   KEY_STUDY_MINIBROTS_RENDER_SPLITTER_POS,
   KEY_STUDY_SPLITTER_POS_PX,
} from "../../../settings/StudySettings.jsx";
import {
   render_magnitude,
   render_pattern_block
} from "../StudyUtils.jsx";
import FractoLegend from "../../../utils/render/FractoLegend.jsx";
import {render_coordinates, render_scalar} from "../../../utils/Dom.jsx";
import {
   CELL_ALIGN_LEFT,
   CELL_ALIGN_RIGHT,
   CELL_TYPE_CALLBACK,
   CELL_TYPE_TEXT_KEY,
   TABLE_NO_BORDER,
   TABLE_NO_HEADER,
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import CoolTable from "../../../utils/ui/CoolTable.jsx";
import {
   KEY_STUDY_COLUMN_LABEL_CORE_POINT,
   KEY_STUDY_COLUMN_LABEL_MAGNITUDE,
} from "../../../text/StudyText.jsx";
import {
   KEY_NAVIGATOR_COVERAGE,
   KEY_NAVIGATOR_SEND_TO,
} from "../../../text/NavigatorText.jsx";
import {render_send_to} from "../../utils/SendTo.jsx";
import {render_coverage} from "../../utils/Coverage.jsx";

const TABLE_COLUMNS = [
   {
      id: "name",
      label: "name",
      type: CELL_TYPE_TEXT_KEY,
      width_px: 35,
      style: {fontWeight: 'bold', color: '#666666', fontStyle: 'italic'},
      align: CELL_ALIGN_RIGHT,
   },
   {
      id: "value",
      label: "value",
      type: CELL_TYPE_CALLBACK,
      align: CELL_ALIGN_LEFT,
   },
]

export class MinibrotRightPanel extends Component {
   static propTypes = {
      selected_minibrot: PropTypes.object.isRequired,
      container_bounds: PropTypes.object.isRequired,
      ready: PropTypes.bool.isRequired,
   }

   title_bar = () => {
      const {selected_minibrot} = this.props
      if (!selected_minibrot.pattern) {
         return ''
      }
      const pattern_block =
         render_pattern_block(selected_minibrot.pattern, 42);

      const minibrot_name_style = {
         fontSize: '1.5rem',
         lineHeight: '1.5rem',
         color: '#777777',
         margin: '0 0.5rem',
         textShadow: '2px 2px 4px rgba(0, 0, 0, 0.25)',
      }
      const name_block = <styles.NumericValue
         style={minibrot_name_style}>
         {selected_minibrot.name}
      </styles.NumericValue>

      return [pattern_block, name_block]
   }

   legend_bar = () => {
      const {selected_minibrot} = this.props
      if (!selected_minibrot.pattern) {
         return ''
      }
      const core_point = JSON.parse(selected_minibrot.core_point)
      const legend = <FractoLegend
         height_px={150}
         focal_point={core_point}
      />
      const display_settings = JSON.parse(selected_minibrot.display_settings)
      const table_data = [
         {
            name: KEY_STUDY_COLUMN_LABEL_MAGNITUDE,
            value: [render_magnitude, selected_minibrot.magnitude],
         },
         {
            name: KEY_STUDY_COLUMN_LABEL_CORE_POINT,
            value: [render_coordinates, core_point],
         },
         {
            name: KEY_NAVIGATOR_COVERAGE,
            value: [render_coverage, display_settings],
         },
         {
            name: KEY_NAVIGATOR_SEND_TO,
            value: [render_send_to, display_settings],
         },
      ]

      const data_table = <styles.FixedInlineBlock
         style={{marginLeft: '0.5rem'}}>
         <CoolTable
            columns={TABLE_COLUMNS}
            data={table_data}
            options={[TABLE_NO_HEADER, TABLE_NO_BORDER]}
         />
      </styles.FixedInlineBlock>
      return [legend, data_table]
   }

   render() {
      const {selected_minibrot, container_bounds, ready} = this.props;
      const splitter_pos = AppSettings.get(KEY_STUDY_MINIBROTS_RENDER_SPLITTER_POS)
      const main_splitter_pos = AppSettings.get(KEY_STUDY_SPLITTER_POS_PX)
      const panel_width_px = container_bounds.width - splitter_pos + main_splitter_pos

      const title_bar = this.title_bar()
      const legend_bar = this.legend_bar()
      const block_style = {
         marginTop: '0.5rem',
      }
      const blocks = [title_bar, legend_bar].map((block, i) => {
         return <CoolStyles.Block
            style={block_style}
            key={`block-${i}`}>
            {block}
         </CoolStyles.Block>
      })
      return <CoolStyles.Block
         style={{height: `${container_bounds.height}px`}}>
         {blocks}
      </CoolStyles.Block>
   }
}

export default MinibrotRightPanel
