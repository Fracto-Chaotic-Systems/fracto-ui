import React, {Component} from "react";
import PropTypes from "prop-types";

import CoolStyles from "../ui/styles/CoolStyles.jsx";
import {MainStyles as styles} from "../../styles/MainStyles.jsx";
import {
   CELL_ALIGN_CENTER,
   CELL_TYPE_NUMBER,
   CELL_TYPE_TEXT,
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
import TilesBackend from "../../backend/TilesBackend.jsx";

const TABLE_COLUMNS = [
   {
      id: "level",
      label: "level",
      type: CELL_TYPE_NUMBER,
      width_px: 65,
      align: CELL_ALIGN_CENTER,
   },
   {
      id: "count",
      label: "count",
      type: CELL_TYPE_NUMBER,
      width_px: 65,
      align: CELL_ALIGN_CENTER,
   },
   {
      id: "percent",
      label: "portion",
      type: CELL_TYPE_TEXT,
      width_px: 65,
      align: CELL_ALIGN_CENTER,
   },
]
const LEVEL_NOT_SELECTED = -1
const NO_COVERAGE = '-'
export const INCLUDE_CAN_DO = 'include_can_do'

export class FractoTileCoverage extends Component {
   static propTypes = {
      bounding_rect: PropTypes.object.isRequired,
      frame_settings: PropTypes.object.isRequired,
      frame_settings_key: PropTypes.string.isRequired,
      on_coverage_data: PropTypes.func.isRequired,
      options: PropTypes.array,
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
      coverage_data: [],
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
      const {on_coverage_data} = this.props
      if (!ctx) {
         console.log('clear_canvas no ctx');
         return;
      }
      this.setState({coverage_data: [],})
      if (on_coverage_data) {
         on_coverage_data(null)
      }
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
      const {frame_settings, options, on_coverage_data} = this.props
      const disabled = AppSettings.get(KEY_NAVIGATOR_DISABLED)
      if (disabled || !frame_settings) {
         return;
      }
      this.clear_canvas(ctx, frame_settings, AppText.get(KEY_HEAT_MAP_FETCHING))
      this.setState({in_fetch: true})
      const result = await TilesBackend.get_heat_map(frame_settings)
      FractoColors.buffer_to_canvas(result.heat_map_buffer, ctx)
      const coverage_data = result.coverage
         .filter(coverage => coverage.length > 0)
         .map((coverage) => {
            const level = coverage[0].length
            const percent = this.find_level_percent(level, result.heat_map_buffer)
            return {
               level,
               count: coverage.length,
               percent: percent ? `${percent}%` : NO_COVERAGE,
            }
         })
      if (options && options.includes(INCLUDE_CAN_DO)) {
         this.process_can_do(coverage_data, result.coverage)
      }
      // console.log('coverage_data', coverage_data)
      this.setState({
         heat_map_buffer: result.heat_map_buffer,
         coverage_data,
      })
      if (on_coverage_data) {
         on_coverage_data(coverage_data)
      }
      this.setState({in_fetch: false})
   }

   find_level_percent = (level, heat_map_buffer) => {
      let count = 0
      let total = 0
      for (let canvas_x = 0; canvas_x < heat_map_buffer.length; canvas_x++) {
         for (let canvas_y = 0; canvas_y < heat_map_buffer[canvas_x].length; canvas_y++) {
            const [zero, pixel_level] = heat_map_buffer[canvas_x][canvas_y]
            if (pixel_level === level) {
               count += 1
            }
            total++
         }
      }
      return Math.round(count * 10000 / total) / 100
   }

   process_can_do = (coverage_data, coverage) => {
      console.log('process_can_do', coverage_data, coverage)
      coverage_data.forEach((c, i) => {
         if (c.percent === NO_COVERAGE) {
            return
         }
         const next_c = coverage_data[i + 1]
         if (!next_c) {
            return;
         }
         next_c.can_do = []
         c.re_do = []
         console.log('process_can_do', c.level)
         const covered_tiles = coverage[c.level]
         const next_covered_tiles = coverage[c.level + 1]
         covered_tiles.forEach(tile => {
            c.re_do.push(tile)
            let short_code = `${tile}0`
            if (!next_covered_tiles.includes(short_code)) {
               next_c.can_do.push(short_code)
            }
            short_code = `${tile}1`
            if (!next_covered_tiles.includes(short_code)) {
               next_c.can_do.push(short_code)
            }
            short_code = `${tile}2`
            if (!next_covered_tiles.includes(short_code)) {
               next_c.can_do.push(short_code)
            }
            short_code = `${tile}3`
            if (!next_covered_tiles.includes(short_code)) {
               next_c.can_do.push(short_code)
            }
         })
      })
   }

   render() {
      const {canvas_ref, in_fetch, coverage_data} = this.state
      const {frame_settings} = this.props
      const canvas_block_style = {
         height: `${frame_settings.width_px}px`,
         width: `${frame_settings.width_px}px`,
         cursor: in_fetch ? 'wait' : 'pointer',
         border: '1px solid #666666',
         borderRadius: '0.25rem',
      }
      const coverage_table = coverage_data.length
         ? <CoolTable
            columns={TABLE_COLUMNS}
            data={coverage_data}
            table_style={{backgroundColor: 'white'}}
         />
         : []
      return <CoolStyles.InlineBlock
         key={'heat-map'}
         title={in_fetch ? 'please be patient' : 'click for heat map'}>
         <CoolStyles.InlineBlock
            onClick={this.generate_heat_map}
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
