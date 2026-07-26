import {find_minibrot} from "../AssetsUtils.jsx";
import AppSettings from "../../../AppSettings.jsx";
import {KEY_ASSETS_DETECTOR_FRAME_SETTINGS} from "../../../settings/AssetsSettings.jsx";

export const find_minima = (frame_settings) => {
   const {canvas_buffer} = frame_settings
   if (!canvas_buffer) {
      return;
   }
   const pattern_minima = {}
   for (let x = 0; x < canvas_buffer.length; x++) {
      const row = canvas_buffer[x]
      for (let y = 0; y < row.length; y++) {
         const element = row[y]
         const [pattern, interations] = element
         if (!pattern) {
            continue
         }
         const key = `_${pattern}`
         if (!Object.hasOwn(pattern_minima, key)) {
            pattern_minima[key] = {pattern, interations, x, y}
         } else if (pattern_minima[key].interations > interations) {
            pattern_minima[key] = {pattern, interations, x, y}
         }
      }
   }
   return Object
      .values(pattern_minima)
      .sort((a, b) => a.interations - b.interations)
      .slice(0, 10)
}

export const highlight_potentials = (ctx, all_minima) => {
   if (!ctx || typeof ctx.beginPath !== 'function') {
      console.log('highlight_potentials: ctx bad', ctx)
      return;
   }
   all_minima.forEach(minima => {
      if (!minima.x) {
         console.log('highlight_potentials: minima.x bad', minima)
         return
      }
      ctx.beginPath();
      ctx.strokeStyle = '#FFFFFFF0';
      ctx.lineWidth = 1;
      ctx.arc(minima.x, minima.y, 12, 0, 2 * Math.PI);
      ctx.stroke();
   })
}

export const highlight_existing = (minibrot_list, frame_settings) => {
   if (!Object.hasOwn(frame_settings, 'focal_point')) {
      return
   }
   const {ctx} = frame_settings
   if (!ctx || typeof ctx.beginPath !== 'function') {
      // console.log('highlight_existing: ctx bad', frame_settings)
      return;
   }
   const half_scope = frame_settings.scope / 2
   const leftmost = frame_settings.focal_point.x - half_scope
   const rightmost = frame_settings.focal_point.x + half_scope
   const topmost = frame_settings.focal_point.y + half_scope
   const bottommost = frame_settings.focal_point.y - half_scope
   const minibrots_in_field = minibrot_list
      .filter(minibrot => {
         const core_point = JSON.parse(minibrot.core_point)
         if (core_point.x < leftmost) {
            return false
         }
         if (core_point.x > rightmost) {
            return false
         }
         if (core_point.y > topmost) {
            return false
         }
         if (core_point.y < bottommost) {
            return false
         }
         return true
      })
   minibrots_in_field
      .sort((a, b) => {
         return b.magnitude - a.magnitude
      })
      .forEach((minibrot, i) => {
         const core_point = JSON.parse(minibrot.core_point)
         const x = (core_point.x - leftmost) * frame_settings.width_px / frame_settings.scope
         const y = (topmost - core_point.y) * frame_settings.width_px / frame_settings.scope
         let width_px = 0
         let color = '#FFFFFF00'
         let line_width = 0
         let text = ''
         if (i < 10) {
            color = '#FFFFFFFF'
            width_px = 12
            line_width = 1.25
            text = `${Math.round(minibrot.magnitude * 1000000)}`
         } else if (i < 50) {
            color = '#FFFFFFa0'
            width_px = 6
            line_width = 1.0
         } else if (i < 250) {
            color = '#FFFFFF80'
            width_px = 3
            line_width = 0.75
         } else if (i < 1250) {
            color = '#FFFFFF40'
            width_px = 1
            line_width = 0.5
         }
         ctx.beginPath();
         ctx.strokeStyle = color;
         ctx.lineWidth = line_width;
         ctx.strokeRect(
            x - (width_px / 2),
            y - (width_px / 2),
            width_px,
            width_px);
         ctx.fillStyle = '#eeeeeeC0';
         ctx.fillText(text, x + width_px, y + width_px / 2);
         ctx.font = '14px monospace';
      })
}

export const detect_now = (frame_settings) => {
   if (!Object.hasOwn(frame_settings, 'canvas_buffer')) {
      return null
   }
   const {canvas_buffer} = frame_settings
   if (!canvas_buffer) {
      return null
   }
   const [core_point, octave_point, pattern] = find_minibrot(
      canvas_buffer,
      frame_settings.focal_point,
      frame_settings.scope)
   if (!pattern) {
      return null
   }
   const x_diff = core_point.x - octave_point.x
   const y_diff = core_point.y - octave_point.y
   const magnitude = Math.sqrt(x_diff * x_diff + y_diff * y_diff)
   const display_settings = {
      focal_point: {
         x: (core_point.x + octave_point.x) / 2,
         y: (core_point.y + octave_point.y) / 2
      },
      scope: magnitude * 3
   }
   const new_bailiwick = {
      pattern,
      magnitude,
      core_point,
      octave_point,
      display_settings,
   }
   console.log('new_bailiwick', new_bailiwick)
   AppSettings.on_settings_changed({
      [KEY_ASSETS_DETECTOR_FRAME_SETTINGS]: {
         focal_point: display_settings.focal_point,
         scope: display_settings.scope,
      }
   })
   return new_bailiwick
}
