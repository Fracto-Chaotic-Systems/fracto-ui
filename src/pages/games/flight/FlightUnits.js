// Instrument calibration at world altitude 1; speed scales with world altitude.
export const FEET_PER_WORLD_UNIT = 2500;
export const FEET_PER_KNOT_SECOND = 6076.11549 / 3600;
// Numerical guards, far beyond tile depth, prevent floating-point under/overflow.
export const MIN_WORLD_ALTITUDE = 1e-100;
export const MAX_WORLD_ALTITUDE = 1e100;
