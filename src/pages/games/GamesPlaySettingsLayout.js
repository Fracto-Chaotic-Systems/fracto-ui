// Left-edge positions corresponding to drawer widths of 50% and 5%.
export const MIN_SETTINGS_POSITION = 0.5;
export const MAX_SETTINGS_POSITION = 0.95;
export const DEFAULT_SETTINGS_POSITION = 0.7;

export function settings_drawer_layout(content_width, saved_position) {
  if (!(content_width > 0)) {
    return { position: DEFAULT_SETTINGS_POSITION, width: 0 };
  }
  const preferred =
    Number.isFinite(saved_position) && saved_position >= 0
      ? saved_position
      : DEFAULT_SETTINGS_POSITION;
  const position = Math.min(
    MAX_SETTINGS_POSITION,
    Math.max(MIN_SETTINGS_POSITION, preferred),
  );
  return { position, width: content_width - content_width * position };
}
