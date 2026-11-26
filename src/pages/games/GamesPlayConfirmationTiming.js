// Long, irregular holds punctuated by occasional brief reversals, like TV static.
export function start_confirmation_prompt(
  on_change,
  {
    window: clock = window,
    document: page = document,
    random = Math.random,
  } = {},
) {
  let timer,
    active = true,
    alternate = false,
    burst = 0;
  const schedule = () => {
    if (!active || page.hidden) return;
    const delay = burst > 0 ? 70 + random() * 130 : 2500 + random() * 6000;
    timer = clock.setTimeout(() => {
      if (!active || page.hidden) return;
      alternate = !alternate;
      on_change(alternate);
      if (burst > 0) burst--;
      else if (random() < 0.3) burst = 2;
      schedule();
    }, delay);
  };
  const visibility = () => {
    clock.clearTimeout(timer);
    schedule();
  };
  page.addEventListener("visibilitychange", visibility);
  schedule();
  return () => {
    active = false;
    clock.clearTimeout(timer);
    page.removeEventListener("visibilitychange", visibility);
  };
}
