import React, {Component} from 'react';
import PropTypes from 'prop-types';

import {
   copy_clipboard,
   copy_json, paste_clipboard,
   render_coordinates,
   render_scalar,
} from "../utils/Dom.jsx";
import CoolTable from "../utils/ui/CoolTable.jsx";

import {MainStyles as main_styles} from "../styles/MainStyles.jsx";
import {NavigatorStyles as styles} from '../styles/NavigatorStyles.jsx';
import AppSettings from "../AppSettings.jsx";
import {
   KEY_NAVIGATOR_COVERAGE,
   KEY_NAVIGATOR_CURSOR_LOCATION,
   KEY_NAVIGATOR_FOCAL_POINT,
   KEY_NAVIGATOR_SCOPE, KEY_NAVIGATOR_SEND_TO
} from "../text/NavigatorText.jsx";
import {
   CELL_ALIGN_LEFT,
   CELL_ALIGN_RIGHT,
   CELL_TYPE_CALLBACK,
   CELL_TYPE_TEXT_KEY,
   TABLE_NO_BORDER,
   TABLE_NO_HEADER
} from "../utils/ui/styles/CoolTableStyles.jsx";

import NavigatorTransit from "./NavigatorTransit.jsx";
import {KEY_NAVIGATOR_DISABLED, KEY_NAVIGATOR_HOVER_POINT} from "../settings/NavigatorSettings.jsx";
import CoolColors from "../utils/ui/CoolColors.jsx";
import {copy, paste} from "../utils/ui/CoolIcons.jsx";
import {render_send_to} from "../pages/utils/SendTo.jsx";
import {render_coverage} from "../pages/utils/Coverage.jsx";

const TRANSITOR_HEIGHT_PX = 150

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
   {
      id: "cursor",
      label: "cursor location",
      type: CELL_TYPE_CALLBACK,
      align: CELL_ALIGN_LEFT,
   },
]

export class NavigatorLegend extends Component {
   static propTypes = {
      bounding_rect: PropTypes.object.isRequired,
      frame_settings: PropTypes.object.isRequired,
      frame_settings_key: PropTypes.string,
   }

   state = {
      interval: null,
      in_wait: false,
   }

   componentDidMount() {
      const interval = setInterval(this.test_wait, 500)
      this.setState({interval})
   }

   componentWillUnmount() {
      const {interval} = this.state
      clearInterval(interval);
   }

   test_wait = () => {
      const in_wait = AppSettings.get(KEY_NAVIGATOR_DISABLED)
      this.setState({in_wait})
   }

   on_focal_point_changed = (focal_point) => {
      const {frame_settings, frame_settings_key} = this.props
      let new_settings = copy_json(frame_settings)
      new_settings.focal_point.x = focal_point.x;
      new_settings.focal_point.y = focal_point.y;
      AppSettings.on_settings_changed({
         [frame_settings_key]: new_settings
      })
   }

   render_focal_point = (focal_point) => {
      const rendered = render_coordinates(focal_point, 10, 'focal_point')
      const icon_style = {
         width: `20px`,
         height: `20px`,
         fill: CoolColors.cool_blue,
      }
      const paste_icon = <main_styles.InlineHover
         title={'click to paste'}
         onClick={() => paste_clipboard('focal_point', KEY_NAVIGATOR_FOCAL_POINT)}
         style={icon_style}>
         {paste}
      </main_styles.InlineHover>
      return [
         rendered,
         paste_icon,
      ]
   }

   render_stats = () => {
      const {frame_settings, bounding_rect} = this.props
      const hover_point = AppSettings.get(KEY_NAVIGATOR_HOVER_POINT)
      if (!frame_settings) {
         return []
      }
      const table_data = [
         {
            name: KEY_NAVIGATOR_SCOPE,
            value: [render_scalar, frame_settings.scope],
         },
         {
            name: KEY_NAVIGATOR_FOCAL_POINT,
            value: [this.render_focal_point, frame_settings.focal_point],
         },
         {
            name: KEY_NAVIGATOR_CURSOR_LOCATION,
            value: [render_coordinates, hover_point],
         },
         {
            name: KEY_NAVIGATOR_COVERAGE,
            value: [render_coverage, frame_settings],
         },
         {
            name: KEY_NAVIGATOR_SEND_TO,
            value: [render_send_to, frame_settings],
         },
      ]
      const stats_style = {width: `${bounding_rect.width - TRANSITOR_HEIGHT_PX - 20}px`}
      return <styles.StatsWrapper style={stats_style}>
         <CoolTable
            columns={TABLE_COLUMNS}
            data={table_data}
            options={[
               TABLE_NO_HEADER,
               TABLE_NO_BORDER,
            ]}
         />
      </styles.StatsWrapper>
   }

   render() {
      const {in_wait} = this.state
      const {frame_settings} = this.props
      const transitor = <NavigatorTransit
         width_px={TRANSITOR_HEIGHT_PX}
         scope={frame_settings?.scope}
         focal_point={frame_settings?.focal_point}
         on_focal_point_changed={this.on_focal_point_changed}
         in_wait={in_wait}
      />
      const stats = this.render_stats()
      return [
         transitor,
         stats,
      ];
   }
}

export default NavigatorLegend
