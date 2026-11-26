// Start from the Reset click itself, retaining the browser's audio permission.
export function create_prelude_soundtrack(audio, on_error, page = document) {
  audio.volume = 0.25;
  let active = false,
    generation = 0,
    run_id;
  const play = () => {
    const token = generation;
    try {
      Promise.resolve(audio.play())
        .then(() => {
          if (!active || page.hidden) audio.pause();
        })
        .catch(() => {
          if (active && token === generation) on_error();
        });
    } catch {
      if (active && token === generation) on_error();
    }
  };
  const stop = (expected_run) => {
    if (expected_run !== undefined && expected_run !== run_id) return;
    active = false;
    generation++;
    audio.pause();
    audio.currentTime = 0;
  };
  const visibility = () => {
    if (!active) return;
    if (page.hidden) audio.pause();
    else play();
  };
  const error = () => {
    if (active) on_error();
  };
  page.addEventListener("visibilitychange", visibility);
  audio.addEventListener("error", error);
  return {
    start(run) {
      stop();
      run_id = run;
      active = true;
      play();
    },
    stop,
    dispose() {
      stop();
      page.removeEventListener("visibilitychange", visibility);
      audio.removeEventListener("error", error);
    },
  };
}
