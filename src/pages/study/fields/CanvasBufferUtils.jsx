
export const collect_orbitals = (canvas_buffer) => {
   const orbital_bins = {
      total_count: 0,
      max_bin: 1
   }
   for (let img_x = 0; img_x < canvas_buffer.length; img_x++) {
      for (let img_y = 0; img_y < canvas_buffer[img_x].length; img_y++) {
         const pattern = canvas_buffer[img_x][img_y][0]
         if (pattern === 0) {
            continue
         }
         const orbital_key = `orbital_${pattern}`
         if (!(orbital_key in orbital_bins)) {
            orbital_bins[orbital_key] = {
               orbital: pattern,
               bin_count: 0,
            }
         }
         orbital_bins.total_count += 1
         orbital_bins[orbital_key].bin_count += 1
         if (orbital_bins[orbital_key].bin_count > orbital_bins.max_bin) {
            orbital_bins.max_bin = orbital_bins[orbital_key].bin_count
         }
      }
   }
   return orbital_bins
}