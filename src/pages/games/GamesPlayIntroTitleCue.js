export const INTRO_TITLE_SECONDS = 29.5;
export const INTRO_TITLE_FADE_SECONDS = 37.21;
export const INTRO_TITLE_END_SECONDS = 42.21;

export function intro_title_opacity(seconds) {
  if (seconds < INTRO_TITLE_SECONDS || seconds >= INTRO_TITLE_END_SECONDS)
    return 0;
  return Math.min(1, (INTRO_TITLE_END_SECONDS - seconds) / 5);
}

export function watch_intro_title_cue(
  audio,
  on_cue,
  environment = { window, document },
) {
  const { window: target, document: page } = environment;
  let active = true,
    frame = null,
    previous_opacity = 0;
  const schedule = () => {
    if (active && !page.hidden && frame === null)
      frame = target.requestAnimationFrame(tick);
  };
  const tick = () => {
    frame = null;
    if (!active || page.hidden) return;
    const seconds = audio?.currentTime ?? 0;
    const opacity = intro_title_opacity(seconds);
    if (opacity !== previous_opacity) {
      previous_opacity = opacity;
      on_cue(opacity);
    }
    if (seconds >= INTRO_TITLE_END_SECONDS) active = false;
    else schedule();
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
    page.removeEventListener("visibilitychange", visibility);
  };
}
