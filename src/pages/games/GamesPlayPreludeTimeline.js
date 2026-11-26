export const PRELUDE_WELCOME_SECONDS = 0.47;
export const PRELUDE_TO_SECONDS = 2.87;
export const PRELUDE_TV_SECONDS = 4;
export const PRELUDE_DURATION_SECONDS = 12.17;
const ease = (time, from, to) => {
  const t = Math.max(0, Math.min(1, (time - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

export function sample_play_prelude(seconds) {
  return {
    welcome_opacity:
      ease(seconds, PRELUDE_WELCOME_SECONDS, 1.27) *
      (1 - ease(seconds, PRELUDE_TO_SECONDS, 3.9)),
    welcome_spacing_em:
      0.04 + 0.56 * ease(seconds, PRELUDE_WELCOME_SECONDS, 3.9),
    to_opacity:
      ease(seconds, PRELUDE_TO_SECONDS, 3.22) * (1 - ease(seconds, 3.65, 4)),
    chaos_opacity:
      seconds >= PRELUDE_TV_SECONDS
        ? 1 - ease(seconds, 6.17, PRELUDE_DURATION_SECONDS)
        : 0,
    tv_visible: seconds >= PRELUDE_TV_SECONDS,
    complete: seconds >= PRELUDE_DURATION_SECONDS,
  };
}

// Audio is the sole clock: buffering pauses cues; delayed frames catch up to music.
export function start_play_prelude(
  on_frame,
  audio,
  environment = { window, document },
) {
  const { window: target, document: page } = environment;
  let active = true,
    frame = null;
  const schedule = () => {
    if (active && !page.hidden && frame === null)
      frame = target.requestAnimationFrame(tick);
  };
  const tick = () => {
    frame = null;
    if (!active || page.hidden) return;
    const elapsed = Math.max(0, audio?.currentTime ?? 0);
    on_frame(Math.min(elapsed, PRELUDE_DURATION_SECONDS));
    if (elapsed >= PRELUDE_DURATION_SECONDS) active = false;
    schedule();
  };
  const visibility = () => {
    if (frame !== null) target.cancelAnimationFrame(frame);
    frame = null;
    schedule();
  };
  page.addEventListener("visibilitychange", visibility);
  schedule();
  return () => {
    active = false;
    if (frame !== null) target.cancelAnimationFrame(frame);
    frame = null;
    page.removeEventListener("visibilitychange", visibility);
  };
}
