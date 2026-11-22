// Both renderers sample the same document animation clock, never mount-local time.
export function game_ambient_motion(time, reduced_motion = false) {
  const wave = reduced_motion ? 0 : Math.sin(time * 0.32);
  return { roll_rad: wave * 0.025, lift: wave * 0.035 };
}
