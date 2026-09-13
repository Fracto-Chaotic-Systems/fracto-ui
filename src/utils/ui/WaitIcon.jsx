import styled from "styled-components";

import CoolStyles from "./styles/CoolStyles.jsx";
import {
  wait_icon,
  wait_icon_2,
  wait_icon_3,
  wait_icon_4,
  wait_icon_5,
  wait_icon_6,
  wait_icon_7,
  wait_icon_8,
  wait_icon_9,
  wait_icon_10,
  wait_icon_11,
  wait_icon_12,
  wait_icon_13,
  wait_icon_14,
  wait_icon_15,
  wait_icon_16,
  wait_icon_17,
  wait_icon_18,
} from "./CoolIcons.jsx";

export const WAIT_ICON_SIZE_PX = 35;
export const WAIT_ICON_DISPLAY_INTERVAL_MS = 1000;

const WAIT_ICONS = [
  wait_icon,
  wait_icon_2,
  wait_icon_3,
  wait_icon_4,
  wait_icon_5,
  wait_icon_6,
  wait_icon_7,
  wait_icon_8,
  wait_icon_9,
  wait_icon_10,
  wait_icon_11,
  wait_icon_12,
  wait_icon_13,
  wait_icon_14,
  wait_icon_15,
  wait_icon_16,
  wait_icon_17,
  wait_icon_18,
];

const shuffle = (values) => {
  const shuffled = values.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap_index = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swap_index]] = [
      shuffled[swap_index],
      shuffled[index],
    ];
  }
  return shuffled;
};

// Shuffle once for the lifetime of the loaded UI. Timestamp buckets then
// select a stable icon, so short wait spans share the same display.
const wait_icon_order = shuffle(WAIT_ICONS);

/**
 * Return the next wait icon in a shuffled, non-repeating sequence.
 *
 * The sequence is module-scoped so each display uses the existing caller
 * cadence without requiring a timer or component state in every caller.
 */
export const get_next_wait_icon = (timestamp_ms = Date.now()) => {
  const display_index =
    Math.floor(timestamp_ms / WAIT_ICON_DISPLAY_INTERVAL_MS) %
    wait_icon_order.length;
  return wait_icon_order[display_index];
};

export const WaitIconWrapper = styled(CoolStyles.InlineBlock)`
  position: absolute;
  left: 0;
  fill: white;
  height: ${WAIT_ICON_SIZE_PX}px;
  width: ${WAIT_ICON_SIZE_PX}px;
  opacity: 0.75;

  svg {
    display: block;
    width: ${WAIT_ICON_SIZE_PX}px;
    height: ${WAIT_ICON_SIZE_PX}px;
  }
`;
