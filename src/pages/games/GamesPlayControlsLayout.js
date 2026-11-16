import {
  DEFAULT_INSTRUMENT_SETTINGS,
  INSTRUMENT_SIZES,
  instrument_codes,
} from "./flight/FlightInstrumentSettings.js";

const CONTROLLER_RATIO = 276 / 232;

// Bounds are measured by GamesPlay, including when its content enters fullscreen.
export function game_controls_layout(
  width_px,
  height_px,
  settings = DEFAULT_INSTRUMENT_SETTINGS,
) {
  const width = Math.max(0, Number.isFinite(width_px) ? width_px : 0);
  const height = Math.max(0, Number.isFinite(height_px) ? height_px : 0);
  const inner_width = Math.max(0, width - 32);
  const compact = width < 768;
  const controller_height = Math.min(
    352 / CONTROLLER_RATIO,
    height * 0.45,
    inner_width / CONTROLLER_RATIO,
  );
  const controller_width = controller_height * CONTROLLER_RATIO;
  const groups = ["left", "right"].map((side) => {
    const count = instrument_codes(settings, side).length;
    const columns = Math.min(compact ? 3 : 2, count);
    return {
      side,
      count,
      columns,
      rows: columns ? Math.ceil(count / columns) : 0,
    };
  });
  const active_groups = groups.filter((group) => group.count);
  const visible = active_groups.length > 0;
  const available_height = Math.max(0, height - 64 - (visible ? 24 : 0));
  const group_width = compact
    ? inner_width
    : (inner_width - controller_width - 48) / 2;
  const size_by_width = Math.min(
    ...active_groups.map(
      (group) => (group_width - (group.columns - 1) * 8) / group.columns,
    ),
  );
  const rows = compact
    ? active_groups.reduce((sum, group) => sum + group.rows, 0)
    : Math.max(0, ...active_groups.map((group) => group.rows));
  const group_gaps = compact
    ? active_groups.reduce((sum, group) => sum + (group.rows - 1) * 8, 0) +
      active_groups.length * 8
    : Math.max(0, rows - 1) * 8;
  const size_by_height = rows
    ? (available_height - (compact ? controller_height : 0) - group_gaps) /
        rows -
      16
    : 0;
  const instrument_size = Math.max(
    0,
    Math.floor(
      Math.min(INSTRUMENT_SIZES[settings.size], size_by_width, size_by_height),
    ),
  );
  // Below this size, dial markings cease to be usable. Retain saved selections
  // while prioritizing the controller until the game area has more room.
  const limited = visible && instrument_size < 48;
  return {
    compact,
    controller_width,
    controller_height,
    instrument_size: limited ? 0 : instrument_size,
    groups: limited
      ? groups.map((group) => ({ ...group, count: 0, columns: 0, rows: 0 }))
      : groups,
    visible: visible && !limited,
    limited,
  };
}
