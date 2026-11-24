// Orthographic cover crop, looking along -Y with north (-Z) at the top.
// Leave a small inset so rasterization never reveals the floor boundary.
export function play_grass_view(floor, width, height) {
  const aspect = Math.max(width, 1) / Math.max(height, 1);
  const [floor_width, floor_length] = floor.size;
  const view_width = Math.min(floor_width * 0.97, floor_length * 0.97 * aspect);
  const view_height = view_width / aspect;
  const center_z = Math.min(0.5, (floor_length * 0.97 - view_height) / 2);
  return { width: view_width, height: view_height, center_z };
}
