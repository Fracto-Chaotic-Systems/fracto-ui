import {GENERATOR_CODE_INTERIOR} from "./GeneratorControl.jsx";
import FractoFastCalc from "../../../../../../sdk/FractoFastCalc.js";
import TilesBackend from "../../../backend/TilesBackend.jsx";

const register_interior_tile = (tile) => {
   console.log('register_interior_tile', tile)
   TilesBackend.upload_points(tile.short_code, {}, 'interior')
}

const register_blank_tile = (tile) => {
   console.log('register_blank_tile', tile)
   TilesBackend.upload_points(tile.short_code, {}, 'blank')
}

const upload_tile_data = (tile, tile_points) => {
   console.log('upload_tile_data', tile)
   TilesBackend.upload_points(tile.short_code, tile_points, 'new')
}

let tile_points = null

const new_tile = () => {
   if (tile_points) {
      return tile_points
   }
   tile_points = new Array(256)
      .fill(0)
      .map(() => new Array(256)
         .fill([0, 0]));
   for (let img_x = 0; img_x < 256; img_x++) {
      for (let img_y = 0; img_y < 256; img_y++) {
         tile_points[img_x][img_y] = [0, 0]
      }
   }
   return tile_points
}

const test_interior = (context_buffer) => {
   for (let col = 0; col < context_buffer.length; col++) {
      for (let row = 0; row < context_buffer[col].length; row++) {
         const pattern = context_buffer[col][row][0]
         if (pattern === 0) {
            return false
         }
      }
   }
   return true
}

const test_blank = (tile_points) => {
   const first_iteration = tile_points[0][0][1]
   for (let col = 0; col < tile_points.length; col++) {
      for (let row = 0; row < tile_points[col].length; row++) {
         const pattern = tile_points[col][row][0]
         if (pattern > 0) {
            return false
         }
         const iteration = tile_points[col][row][1]
         if (first_iteration !== iteration) {
            return false
         }
      }
   }
   return true
}
const calculate_tile = (tile, tile_points) => {
   console.log("calculate_tile", tile)
   const short_code = tile.short_code
   const level = short_code.length
   const increment = (tile.bounds.right - tile.bounds.left) / 256.0;
   let estimated = 0
   try {
      for (let img_x = 0; img_x < 256; img_x++) {
         const x = tile.bounds.left + img_x * increment;
         for (let img_y = 0; img_y < 256; img_y++) {
            const y = tile.bounds.top - img_y * increment;
            const values = FractoFastCalc.calc(x, y, level)
            tile_points[img_x][img_y][0] = values.pattern;
            tile_points[img_x][img_y][1] = values.iteration;
            if (values.estimated) {
               estimated++
            }
         }
      }
      if (estimated) {
         console.log(`tile ${tile.short_code} has ${estimated} estimated point(s)`)
      }
      return tile_points;
   } catch (e) {
      console.error(e)
      debugger;
      return tile_points;
   }
}

export const generate_tile_points = (tile, generate_code, context_buffer) => {
   const tile_points = new_tile()
   let duration = 0
   const is_interior = test_interior(context_buffer)
   let is_blank = false
   if (is_interior && generate_code !== GENERATOR_CODE_INTERIOR) {
      console.log('interior tile is bypassed')
      register_interior_tile(tile)
   } else {
      const start = performance.now()
      calculate_tile(tile, tile_points)
      const end = performance.now()
      duration = end - start
      is_blank = test_blank(tile_points)
      if (is_blank) {
         register_blank_tile(tile)
      } else {
         upload_tile_data(tile, tile_points)
      }
   }
   return {
      tile,
      tile_points,
      is_interior,
      is_blank,
      duration,
      timestamp: Date.now()
   }
}
