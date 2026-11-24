// Keep the rotating viewport inside a circle narrower than the floor.
// This excludes dirt-plane edges throughout a half-turn at every aspect ratio.
export function play_grass_view(floor, width, height) {
  const aspect = Math.max(width, 1) / Math.max(height, 1);
  const [floor_width, floor_length] = floor.size;
  const diameter = Math.min(floor_width, floor_length) * 0.97;
  const view_width = diameter / Math.hypot(1, 1 / aspect);
  const view_height = view_width / aspect;
  return { width: view_width, height: view_height };
}
