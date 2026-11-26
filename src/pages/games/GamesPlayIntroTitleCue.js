export const INTRO_TITLE_SECONDS = 29.66;

export function watch_intro_title_cue(
  audio,
  on_cue,
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
    if ((audio?.currentTime ?? 0) >= INTRO_TITLE_SECONDS) {
      active = false;
      on_cue();
    } else schedule();
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
