import {
   MainStyles as styles,
   MARGIN_PX
} from '../../styles/MainStyles.jsx'
import FractoColors from "../../utils/render/FractoColors.jsx";

export const FETCH_JSON_HEADERS = {
   'Content-Type': 'application/json',
   'Accept': 'application/json'
}

const draw_highlight = (ctx, img_x, img_y, color) => {
   try {
      ctx.strokeStyle = color
      ctx.beginPath();
      ctx.moveTo(img_x - 15, img_y);
      ctx.lineTo(img_x + 15, img_y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(img_x, img_y - 15);
      ctx.lineTo(img_x, img_y + 15);
      ctx.stroke();
      ctx.strokeRect(img_x - 5, img_y - 5, 10, 10);
   } catch (e) {
      console.log('highlight_canvas error', e.message, ctx, img_x, img_y);
   }
}

export const highlight_canvas = (ctx, img_x, img_y) => {
   if (typeof ctx.beginPath !== 'function') {
      return
   }
   ctx.lineWidth = 1.5;
   draw_highlight(ctx, img_x + 1, img_y + 1, '#666666')
   draw_highlight(ctx, img_x, img_y, 'white')
}

export const identify_cores = (frame_settings) => {
   if (!frame_settings.canvas_buffer || !frame_settings.ctx) {
      console.log('no canvas_buffer or ctx');
      return
   }
   const orbital_bins = []
   for (let canvas_x = 0; canvas_x < frame_settings.canvas_buffer.length; canvas_x++) {
      for (let canvas_y = 0; canvas_y < frame_settings.canvas_buffer[canvas_x].length; canvas_y++) {
         const point_data = frame_settings.canvas_buffer[canvas_x][canvas_y]
         const cardinality = point_data[0]
         if (cardinality === 0) {
            continue
         }
         const iterations = point_data[1]
         let bin = orbital_bins.find(bin => bin.cardinality === cardinality)
         if (!bin) {
            bin = {
               cardinality: cardinality,
               lowest_iterations: iterations,
               canvas_x, canvas_y,
            }
            orbital_bins.push(bin)
         } else if (bin.lowest_iterations > iterations) {
            bin.lowest_iterations = iterations
            bin.canvas_x = canvas_x
            bin.canvas_y = canvas_y
         }
      }
   }
   for (let i = 0; i < orbital_bins.length; i++) {
      const point = orbital_bins[i]
      const too_close = orbital_bins.filter((test_pt, j) => {
         if (j === i) {
            return false
         }
         if (test_pt.exclude) {
            return false
         }
         if (
            test_pt.canvas_x < MARGIN_PX
            || test_pt.canvas_x > frame_settings.width_px - MARGIN_PX
            || test_pt.canvas_y < MARGIN_PX
            || test_pt.canvas_y > frame_settings.width_px - MARGIN_PX
         ) {
            return true
         }
         if (test_pt.canvas_x - 25 > point.canvas_x) {
            return false
         }
         if (test_pt.canvas_x + 25 < point.canvas_x) {
            return false
         }
         if (test_pt.canvas_y + 25 < point.canvas_y) {
            return false
         }
         if (test_pt.canvas_y - 25 > point.canvas_y) {
            return false
         }
         if (test_pt.cardinality < point.cardinality) {
            return false
         }
         return true
      })
      too_close.forEach(pt => pt.exclude = true)
   }
   return orbital_bins
}

export const render_magnitude = (magnitude) => {
   const rounded = Math.round(magnitude * 10000000000) / 10000
   const mu = <i>{'\u03BC'}</i>
   return <styles.NumericValue
      title={magnitude}
      style={{verticalAlign: 'middle'}}> {rounded}
      <styles.MuStyle>{mu}</styles.MuStyle>
   </styles.NumericValue>
}

export const render_pattern_block = (pattern, font_size_px = 18) => {
   const pattern_color = FractoColors.pattern_color(pattern);
   // console.log('pattern_color', pattern_color)
   const padding_top = Math.min(2 + font_size_px / 30, 4)
   const padding_side = 2 + font_size_px / 12
   const block_style = {
      textShadow: '3px 3px 6px rgba(0,0,0,0.75)',
      backgroundColor: pattern_color,
      borderRadius: `${font_size_px / 4}px`,
      padding: `${padding_top}px ${padding_side}px 0`,
      fontSize: `${font_size_px}px`,
      lineHeight: `${font_size_px}px`,
   }
   return <styles.PatternBlock
      style={block_style}>
      {pattern}
   </styles.PatternBlock>
}
