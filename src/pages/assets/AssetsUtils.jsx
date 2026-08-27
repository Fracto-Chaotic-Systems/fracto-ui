import React from "react";

import CoolTable from "../../utils/ui/CoolTable.jsx";
import {
   CELL_ALIGN_CENTER,
   CELL_TYPE_NUMBER,
   CELL_TYPE_TEXT
} from "../../utils/ui/styles/CoolTableStyles.jsx";
import AppSettings from "../../AppSettings.jsx";
import {KEY_VIEWPORT_DIMENSIONS} from "../../settings/RootSettings.jsx";
import {KEY_ASSETS_SPLITTER_POS_PX} from "../../settings/AssetsSettings.jsx";
import MinibrotBackend from "../../backend/MinibrotBackend.jsx";

export const RESOLUTIONS = [
   {label: '150', value: 150, help: 'thumbnail',},
   {label: '300', value: 300, help: 'tiny',},
   {label: '600', value: 600, help: 'small',},
   {label: '1200', value: 1200, help: 'medium',},
   {label: '1800', value: 1800, help: 'large',},
   {label: '2400', value: 2400, help: 'super',},
   {label: '3200', value: 3200, help: 'way big',},
   {label: '3600', value: 3600, help: 'bigger still',},
   {label: '4800', value: 4800, help: 'biggliest!',},
]

const TABLE_COLUMNS = [
   {
      id: "level",
      label: "level",
      type: CELL_TYPE_NUMBER,
      width_px: 35,
      align: CELL_ALIGN_CENTER,
   },
   {
      id: "tile_count",
      label: "tile count",
      type: CELL_TYPE_NUMBER,
      width_px: 80,
      align: CELL_ALIGN_CENTER,
   },
   {
      id: "percent",
      label: "percent",
      type: CELL_TYPE_TEXT,
      width_px: 80,
      align: CELL_ALIGN_CENTER,
   },
]

const get_proportions = (heat_map_buffer) => {
   const result = new Array(50).fill(0)
   for (let col = 0; col < heat_map_buffer.length; col++) {
      for (let row = 0; row < heat_map_buffer[col].length; row++) {
         const level = heat_map_buffer[col][row][1]
         result[level]++
      }
   }
   const total_points = heat_map_buffer.length * heat_map_buffer.length
   return result
      .map((count, level) => {
         return {
            level: level,
            percent: Math.round(count * 10000 / total_points) / 100,
         }
      })
      .filter(item => item.percent > 0)
}

export const render_coverage_table = (coverage_data, heat_map_buffer) => {
   if (!coverage_data) {
      return []
   }
   const proportions = get_proportions(heat_map_buffer)
   // console.log('proportions', proportions)
   const table_data = coverage_data
      .filter(item => item.tiles?.length > 1)
      .map((item, index) => {
         const pro = proportions.find(pro => item.level === pro.level)
         return {
            level: item.level,
            tile_count: item.tiles.length,
            percent: pro ? `${pro.percent}%` : '-'
         }
      })
   return <CoolTable
      columns={TABLE_COLUMNS}
      data={table_data}
   />
}

const find_octave_point = (core_point, candidates, scope) => {
   for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i]
      const x_offset = core_point.x - candidate.x
      const y_offset = core_point.y - candidate.y
      const distance = Math.sqrt(x_offset * x_offset + y_offset * y_offset)
      if (distance > scope / 5) {
         return candidate;
      }
   }
   return null;
}

export const find_minibrot = (canvas_buffer, focal_point, scope) => {
   const increment = scope / canvas_buffer.length;
   const leftmost = focal_point.x - scope / 2
   const topmost = focal_point.y + scope / 2
   const best_patterns = []
   for (let img_x = 1; img_x < canvas_buffer.length - 1; img_x++) {
      const x = leftmost + increment * img_x
      for (let img_y = 1; img_y < canvas_buffer[img_x].length - 1; img_y++) {
         const y = topmost - increment * img_y
         const [pattern, iteration] = canvas_buffer[img_x][img_y]
         if (pattern <= 1) {
            continue;
         }
         let perimeter = 0
         for (let i = -1; i <= 1; i++) {
            // const x_per = leftmost + increment * (img_x + i)
            for (let j = -1; j <= 1; j++) {
               if (!i && !j) {
                  continue;
               }
               // const y_per = topmost - increment * (img_y + j)
               let [pat, iter] = canvas_buffer[img_x + i][img_y + j]
               perimeter += iter
            }
         }
         let pattern_bin = best_patterns.find(bin => bin.pattern === pattern)
         if (!pattern_bin) {
            pattern_bin = {
               pattern: pattern, points: []
            }
            best_patterns.push(pattern_bin)
         }
         pattern_bin.points.push({x: x, y: y, perimeter: perimeter})
      }
   }
   if (!best_patterns.length) {
      return [0, 0, 0]
   }
   const result = best_patterns
      .sort((a, b) => a.pattern - b.pattern)
   result.forEach(r => {
      r.points = r.points.sort((a, b) => a.perimeter - b.perimeter)
   })
   const core_point = best_patterns[0].points[0]
   delete core_point.perimeter
   const octave_point = find_octave_point(core_point, best_patterns[1].points, scope)
   delete octave_point.perimeter
   const pattern = best_patterns[0].pattern
   return [core_point, octave_point, pattern]
}

export const save_bailiwick = (core_point, octave_point, pattern, id = 0) => {
   const x_diff = core_point.x - octave_point.x
   const y_diff = core_point.y - octave_point.y
   const magnitude = Math.sqrt(x_diff * x_diff + y_diff * y_diff)
   const new_bailiwick = {
      pattern: pattern,
      magnitude: magnitude,
      core_point: {x: core_point.x, y: core_point.y},
      octave_point: {x: octave_point.x, y: octave_point.y},
      display_settings: {
         focal_point: {
            x: (core_point.x + octave_point.x) / 2,
            y: (core_point.y + octave_point.y) / 2
         },
         scope: magnitude * 3
      },
   }
   if (id) {
      new_bailiwick.id = id
   }
   MinibrotBackend.save_bailiwick(new_bailiwick, 0, result => {
      console.log("BailiwickData.save_bailiwick", result)
   })
}
