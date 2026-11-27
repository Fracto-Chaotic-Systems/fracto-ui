const RAD = Math.PI / 180;
const wrap = (angle) => ((angle % 360) + 360) % 360;

/** Aim at the set center in the craft's banked frame, then apply user look offsets. */
export function auto_pilot_view(state, look_heading = 0, look_pitch = 0) {
  const re = -0.75 - state.position_re;
  const im = -state.position_im;
  const up = -state.altitude_world;
  const heading = state.heading_deg * RAD;
  const pitch = state.pitch_deg * RAD;
  const roll = state.roll_deg * RAD;
  const along = re * Math.sin(heading) + im * Math.cos(heading);
  const across = re * Math.cos(heading) - im * Math.sin(heading);
  const forward = along * Math.cos(pitch) + up * Math.sin(pitch);
  const level_up = -along * Math.sin(pitch) + up * Math.cos(pitch);
  const right = across * Math.cos(roll) - level_up * Math.sin(roll);
  const body_up = level_up * Math.cos(roll) + across * Math.sin(roll);
  return {
    ...state,
    camera_heading_deg: wrap(Math.atan2(right, forward) / RAD + look_heading),
    camera_pitch_deg: Math.max(
      -90,
      Math.min(
        90,
        Math.atan2(body_up, Math.hypot(forward, right)) / RAD + look_pitch,
      ),
    ),
  };
}
