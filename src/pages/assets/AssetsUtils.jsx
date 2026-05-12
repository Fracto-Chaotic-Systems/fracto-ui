import React from "react";

import CoolTable from "../../utils/ui/CoolTable.jsx";
import {
   CELL_ALIGN_CENTER,
   CELL_TYPE_NUMBER,
   CELL_TYPE_TEXT
} from "../../utils/ui/styles/CoolTableStyles.jsx";

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