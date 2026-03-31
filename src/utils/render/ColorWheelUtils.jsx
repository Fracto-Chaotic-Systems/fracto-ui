import FractoColors from "./FractoColors.jsx";

export const TWO_PI = 2 * Math.PI;
const PI_BY_2 = Math.PI / 2

const draw_region = (ctx, canvas_width_px, radius1, radius2, angle1, angle2, pattern, color_phase = 0, opacity = 1.0, outline = false) => {
   const [h, s, l] = FractoColors.fracto_pattern_color_hsl(pattern, 500)
   const color = `hsla(${h + color_phase}, ${s}%, ${l}%, ${opacity})`
   ctx.fillStyle = color
   ctx.strokeStyle = outline ? 'black' : color
   const size_by_two = canvas_width_px / 2
   ctx.beginPath();
   // ctx.strokeStyle = 'black'
   ctx.arc(size_by_two, size_by_two, radius1, angle1, angle2, false);
   ctx.arc(size_by_two, size_by_two, radius2, angle2, angle1, true);
   ctx.closePath();

   ctx.fill();
   ctx.stroke();

   if (pattern < 64) {
      const text_pos_x =
         size_by_two + (radius2 + radius1) / 2 * Math.cos((angle1 + angle2) / 2);
      const text_pos_y =
         size_by_two + (radius2 + radius1) / 2 * Math.sin((angle1 + angle2) / 2);

      ctx.font = `lighter ${Math.round(canvas_width_px / 40)}px Courier, monospace`;
      ctx.strokeStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(`${pattern}`, text_pos_x, text_pos_y);
   }
}

export const draw_circle = (ctx, x, y, radius, color) => {
   ctx.beginPath();
   ctx.strokeStyle = 'black'
   ctx.fillStyle = color
   ctx.arc(x, y, radius, 0, 359.9, false);
   ctx.fill();
   ctx.stroke();
   ctx.closePath();
}

const get_opacity = (orbital_bins, pattern) => {
   if (orbital_bins) {
      const orbital_key = `orbital_${pattern}`
      if (orbital_bins[orbital_key]) {
         return 0.15 + 0.75 * orbital_bins[orbital_key].portion
      }
   }
   return 0.15
}

export const color_wheel = (canvas_ref, radius, ring_count = 5, color_phase = 0, orbital_bins = null) => {
   const canvas = canvas_ref.current
   if (!canvas) {
      return
   }
   if (orbital_bins) {
      let greatest_bin_count = 0
      const pattern_limit = Math.pow(2, ring_count)
      for (let pattern = 1; pattern < pattern_limit; pattern++) {
         const orbital_key = `orbital_${pattern}`
         if (orbital_bins[orbital_key]) {
            if (greatest_bin_count < orbital_bins[orbital_key].bin_count) {
               greatest_bin_count = orbital_bins[orbital_key].bin_count
            }
         }
      }
      const log_greatest_bin_count = Math.log(greatest_bin_count)
      for (let pattern = 1; pattern < pattern_limit; pattern++) {
         const orbital_key = `orbital_${pattern}`
         if (orbital_bins[orbital_key]) {
            orbital_bins[orbital_key].portion =
               Math.log(orbital_bins[orbital_key].bin_count) / log_greatest_bin_count
         }
      }
      console.log('orbital_bins', orbital_bins)
   }

   const ctx = canvas.getContext('2d');
   ctx.lineWidth = radius / 500;

   const bounds = canvas.getBoundingClientRect();
   const width_px = bounds.width;

   const gradient = ctx.createLinearGradient(180, 0, 0, 180); // Horizontal gradient
   gradient.addColorStop(0, '#bbbbbb'); // Start color
   gradient.addColorStop(1, '#ffffff'); // End color
   ctx.fillStyle = gradient
   ctx.fillRect(0, 0, width_px, width_px);

   const radii = [];
   for (let i = 1; i <= ring_count; i++) {
      radii.push(i * radius / ring_count);
   }

   let angle = -PI_BY_2
   let pattern = 2
   const size_by_two = width_px / 2
   draw_circle(ctx, size_by_two, size_by_two, radii[ring_count - 1],
      `white`)
   for (let ring = 1; ring <= ring_count; ring++) {
      const limit = Math.pow(2, ring + 1) - 1
      const angle_increment = Math.PI / Math.pow(2, ring - 1)
      for (; pattern <= limit; pattern++) {
         const opacity = get_opacity(orbital_bins, pattern)
         draw_region(
            ctx,
            width_px,
            radii[ring - 1],
            radii[ring],
            angle,
            angle + angle_increment,
            pattern,
            color_phase,
            opacity,
            ring < 7
         )
         angle += angle_increment
      }
   }

   let [h, s, l] = FractoColors.fracto_pattern_color_hsl(1, 500)
   const opacity = get_opacity(orbital_bins, 1)
   draw_circle(ctx, size_by_two, size_by_two, radii[0],
      `hsla(${h + color_phase}, ${s}%, ${l}%, ${opacity})`)
   draw_circle(ctx, size_by_two, size_by_two, radii[ring_count - 1],
      `transparent`)
   draw_circle(ctx, size_by_two, size_by_two, radii[ring_count - 2],
      `transparent`)
   ctx.strokeStyle = 'white';
   ctx.textAlign = 'center';
   ctx.textBaseline = 'middle';
   ctx.strokeText(`1`, size_by_two, size_by_two);
}