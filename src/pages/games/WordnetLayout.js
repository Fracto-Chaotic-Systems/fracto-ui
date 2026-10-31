export function wordnet_split_bounds(width, bar_width, saved_position) {
  const available = Math.max(0, width - bar_width);
  const min = Math.min(180, available / 2);
  const max = Math.max(min, available - 180);
  const requested = Number.isFinite(saved_position) ? saved_position : 450;
  return { min, max, position: Math.min(max, Math.max(min, requested)) };
}
