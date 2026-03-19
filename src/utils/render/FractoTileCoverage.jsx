import React, {Component} from "react";
import PropTypes from "prop-types";

import {
   FRACTO_TILES_PORT,
   FRACTO_UI_PORT
} from "../../../../../constants.js";

import CoolStyles from "../ui/styles/CoolStyles.jsx";
import {MainStyles as styles} from "../../styles/MainStyles.jsx";
import {
   CELL_ALIGN_CENTER,
   CELL_TYPE_NUMBER, TABLE_NO_BORDER,
} from "../ui/styles/CoolTableStyles.jsx";
import AppSettings from "../../AppSettings.jsx";
import {KEY_NAVIGATOR_DISABLED} from "../../settings/NavigatorSettings.jsx";
import AppText from "../../AppText.jsx";
import {
   KEY_HEAT_MAP_CLICK_TO_TEST,
   KEY_HEAT_MAP_FETCHING
} from "../../text/NavigatorText.jsx";

import FractoColors from "./FractoColors.jsx";
import CoolTable from "../ui/CoolTable.jsx";

const TABLE_COLUMNS = [
   {
      id: "level",
      label: "level",
      type: CELL_TYPE_NUMBER,
      width_px: 35,
      align: CELL_ALIGN_CENTER,
   },
   {
      id: "count",
      label: "count",
      type: CELL_TYPE_NUMBER,
      width_px: 80,
      align: CELL_ALIGN_CENTER,
   },
]

export class FractoTileCoverage extends Component {
   static propTypes = {
      bounding_rect: PropTypes.object.isRequired,
      frame_settings: PropTypes.object.isRequired,
      frame_settings_key: PropTypes.string.isRequired,
   }

   state = {
      canvas_ref: React.createRef(),
      subscription: null,
      stored_width_px: 1,
      stored_scope: 1,
      stored_focal_point_x: 1,
      stored_focal_point_y: 1,
      in_fetch: false,
      heat_map_buffer: [],
      tiles_coverage: [],
   }

   componentDidMount() {
      const {canvas_ref} = this.state;
      const {frame_settings, frame_settings_key} = this.props;
      const canvas = canvas_ref.current;
      let ctx = null
      if (canvas) {
         ctx = canvas.getContext('2d');
         this.clear_canvas(ctx, frame_settings, AppText.get(KEY_HEAT_MAP_CLICK_TO_TEST));
      } else {
         console.log('FractoHeatMap no canvas');
      }
      this.setState({
         ctx,
         stored_scope: frame_settings.scope,
         stored_focal_point_x: frame_settings.focal_point?.x,
         stored_focal_point_y: frame_settings.focal_point?.y,
         stored_width_px: frame_settings.width_px,
         subscription: AppSettings
            .subscribe(frame_settings_key, this.on_frame_settings_changed)
      })
   }

   componentDidUpdate(prevProps, prevState, snapshot) {
      const {ctx} = this.state
      const {frame_settings} = this.props
      const width_changed =
         this.state.stored_width_px !== frame_settings.width_px
      const scope_changed =
         this.state.stored_scope !== frame_settings.scope
      const focal_point_x_changed =
         this.state.stored_focal_point_x !== frame_settings.focal_point.x
      const focal_point_y_changed =
         this.state.stored_focal_point_y !== frame_settings.focal_point.y
      if (width_changed || scope_changed || focal_point_x_changed || focal_point_y_changed) {
         this.setState({
            stored_scope: frame_settings.scope,
            stored_focal_point_x: frame_settings.focal_point.x,
            stored_focal_point_y: frame_settings.focal_point.y,
            stored_width_px: frame_settings.width_px,
         })
         this.clear_canvas(ctx, frame_settings, AppText.get(KEY_HEAT_MAP_CLICK_TO_TEST));
      }
   }

   componentWillUnmount() {
      const {subscription} = this.state
      if (subscription) {
         AppSettings.unsubscribe(subscription)
      }
   }

   clear_canvas = (ctx, frame_settings, text) => {
      if (!ctx) {
         console.log('clear_canvas no ctx');
         return;
      }
      this.setState({tiles_coverage: []})
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, frame_settings.width_px, frame_settings.width_px);
      ctx.fillStyle = 'black';
      ctx.font = `italic ${16}px Arial`;
      ctx.textAlign = 'center'; // Center text on the x coordinate
      ctx.fillText(text, frame_settings.width_px / 2, frame_settings.width_px / 2);
   }

   on_frame_settings_changed = (key, value) => {
      const {ctx} = this.state
      this.clear_canvas(ctx, value, AppText.get(KEY_HEAT_MAP_CLICK_TO_TEST))
   }

   generate_heat_map = async () => {
      const {ctx} = this.state
      const {frame_settings} = this.props
      const disabled = AppSettings.get(KEY_NAVIGATOR_DISABLED)
      if (disabled || !frame_settings) {
         return;
      }
      const all_params = [
         `width_px=${frame_settings?.width_px}`,
         `focal_point_x=${frame_settings.focal_point.x}`,
         `focal_point_y=${frame_settings.focal_point.y}`,
         `scope=${frame_settings.scope}`,
         `aspect_ratio=${1}`,
      ].join('&')
      const origin = window.origin.replace(`${FRACTO_UI_PORT}`, `${FRACTO_TILES_PORT}`)
      const url = `${origin}/heat_map_buffer?${all_params}`
      this.clear_canvas(ctx, frame_settings, AppText.get(KEY_HEAT_MAP_FETCHING))
      this.setState({in_fetch: true})
      try {
         console.log('fetching heat map', url)
         const result = await fetch(url, {}).then(res => res.json())
         FractoColors.buffer_to_canvas(result.heat_map_buffer, ctx)
         console.log('new heat map', result)
         this.setState({
            heat_map_buffer: result.heat_map_buffer,
            tiles_coverage: result.coverage || [],
            in_fetch: false
         })
      } catch (e) {
         console.error(`error fetching ${url}`)
      }
   }

   render() {
      const {canvas_ref, in_fetch, tiles_coverage} = this.state
      const {frame_settings} = this.props
      const canvas_block_style = {
         height: `${frame_settings.width_px}px`,
         width: `${frame_settings.width_px}px`,
         cursor: in_fetch ? 'wait' : 'pointer',
         border: '1px solid #666666',
         borderRadius: '0.25rem',
      }
      let coverage_data = []
      if (tiles_coverage.length > 0) {
         coverage_data = tiles_coverage
            .filter(coverage => coverage.length > 0)
            .map((coverage) => {
               return {
                  level: coverage[0].length,
                  count: coverage.length,
               }
            })
      }
      console.log('coverage_data', coverage_data)
      const coverage_table = coverage_data.length
         ? <CoolTable
            columns={TABLE_COLUMNS}
            data={coverage_data}
            options={[TABLE_NO_BORDER]}
            table_style={{backgroundColor: 'white'}}
         />
         : []
      return <CoolStyles.InlineBlock
         key={'heat-map'}
         title={in_fetch ? 'please be patient' : 'click for heat map'}
         onClick={this.generate_heat_map}>
         <CoolStyles.InlineBlock
            style={canvas_block_style}>
            <canvas
               ref={canvas_ref}
               width={frame_settings.width_px}
               height={frame_settings.width_px}
            />
         </CoolStyles.InlineBlock>
         <styles.OneRemSpacer/>
         <CoolStyles.InlineBlock
            key={'coverage-table'}>
            {coverage_table}
         </CoolStyles.InlineBlock>
      </CoolStyles.InlineBlock>
   }
}

export default FractoTileCoverage
