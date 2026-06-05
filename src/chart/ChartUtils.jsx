export const find_bounds = (set1, other_sets, in_cardioid, escaper) => {
   // console.log('find_radius = (set, center', set, center)
   let min_x = 1000
   let max_x = -1000
   let min_y = 1000
   let max_y = -1000
   set1.forEach(point => {
      if (point.x > max_x) {
         max_x = point.x
      }
      if (point.x < min_x) {
         min_x = point.x
      }
      if (point.y > max_y) {
         max_y = point.y
      }
      if (point.y < min_y) {
         min_y = point.y
      }
   })
   other_sets.forEach(point => {
      // console.log('other sets point', point.x, point.y)
      // console.log('other sets max_x, min_x', max_x, min_x)
      // console.log('other sets max_y, min_y', max_y, min_y)
      if (point.x > max_x) {
         max_x = point.x
      }
      if (point.x < min_x) {
         min_x = point.x
      }
      if (point.y > max_y) {
         max_y = point.y
      }
      if (point.y < min_y) {
         min_y = point.y
      }
   })
   const x_center = (max_x + min_x) / 2
   const y_center = (max_y + min_y) / 2
   const x_extent = max_x - min_x
   const y_extent = max_y - min_y
   const extent_by_2 = 1.1 * Math.max(x_extent, y_extent) / 2
   min_x = x_center - extent_by_2
   max_x = x_center + extent_by_2
   min_y = y_center - extent_by_2
   max_y = y_center + extent_by_2
   return {min_x, max_x, min_y, max_y}
}