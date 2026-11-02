const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
const head = () => document.querySelector("[data-playhead]");
const region = () =>
  document.querySelector('[aria-label="MIDI track timeline"]');
const follow = () =>
  [...document.querySelectorAll("label")]
    .find((label) => label.textContent.includes("Follow playhead"))
    .querySelector("input");
const count = (key) =>
  [...document.querySelectorAll(`canvas[data-${key}-count]`)].reduce(
    (sum, canvas) => sum + Number(canvas.getAttribute(`data-${key}-count`)),
    0,
  );
export async function prepare_sync() {
  check(
    document.querySelector('[data-event-lane="tempo"]'),
    "Tempo lane missing",
  );
  check(
    document
      .querySelector('[data-event-lane="meter"]')
      .textContent.includes("4/4"),
    "Default meter not shown",
  );
  check(
    document.querySelector('[data-event-lane="pedal"][data-channel="0"]'),
    "Channel pedal lane missing",
  );
  follow().click();
  const slider = document.querySelector('input[aria-label="Zoom"]');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(
    slider,
    "2",
  );
  slider.dispatchEvent(new Event("input", { bubbles: true }));
  await sleep(50);
  region().scrollLeft = 0;
  region().dispatchEvent(new Event("scroll"));
}
export async function verify_live_sync(context, until) {
  await until(
    () =>
      head()?.dataset.clockRunning === "true" &&
      Number(head().dataset.seconds) > 0.08 &&
      count("held") === 3,
    "held-note highlights",
  );
  const origin = context.scheduled_starts[0].when;
  const error = Math.abs(
    Number(head().dataset.seconds) - Math.max(0, context.currentTime - origin),
  );
  check(error < 0.12, "Playhead drifted from the audio clock");
  check(
    document
      .querySelector('[data-event-lane="tempo"]')
      .textContent.includes("100 BPM"),
    "Current tempo label incorrect",
  );
  check(
    document
      .querySelector('[data-event-lane="pedal"]')
      .textContent.includes("Pedal down"),
    "Current pedal state incorrect",
  );
  // Audio time, rather than wall time, must drive both cursor and highlights.
  await context.suspend();
  await sleep(100);
  const suspended_position = Number(head().dataset.seconds);
  const suspended_time = context.currentTime;
  await sleep(250);
  check(
    Math.abs(context.currentTime - suspended_time) < 0.001,
    "Suspended audio clock advanced",
  );
  check(
    Math.abs(Number(head().dataset.seconds) - suspended_position) < 0.001,
    "Playhead advanced during suspension",
  );
  check(count("held") === 3, "Suspension lost held highlights");
  await context.resume();
  const far = region().scrollWidth - region().clientWidth;
  region().scrollLeft = far;
  region().dispatchEvent(new Event("scroll"));
  await sleep(100);
  check(
    Math.abs(region().scrollLeft - far) < 1,
    "Follow-off overrode manual scroll",
  );
  follow().click();
  await until(
    () => region().scrollLeft < far - 10,
    "follow recentered playhead",
  );
  await until(
    () =>
      Number(head().dataset.seconds) > 2.45 &&
      count("sustained") === 3 &&
      count("held") === 0,
    "pedal-held highlights",
  );
  return {
    audio_clock_error_seconds: error,
    suspended_clock_and_highlights_frozen: true,
    held_notes: 3,
    pedal_held_notes: 3,
    manual_scroll_respected: true,
    follow_recentered: true,
  };
}
export function verify_stopped_sync() {
  for (const canvas of document.querySelectorAll("canvas[data-held-count]")) {
    const pixels = canvas
      .getContext("2d")
      .getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < pixels.length; i += 4)
      check(pixels[i] === 0, "Stop left stale highlight pixels");
  }
  check(Number(head().dataset.seconds) === 0, "Stop did not reset playhead");
  check(
    count("held") === 0 && count("sustained") === 0,
    "Stop left highlighted notes",
  );
}
export function verify_completed_sync(duration) {
  check(
    Number(head().dataset.seconds) === duration,
    "Completion lost final playhead position",
  );
  check(
    count("held") === 0 && count("sustained") === 0,
    "Completion left highlighted notes",
  );
  check(
    document
      .querySelector('[data-event-lane="tempo"]')
      .textContent.includes("200 BPM"),
    "Tempo lane did not follow change",
  );
}

export function verify_completed_events() {
  check(
    document
      .querySelector('[data-event-lane="meter"]')
      .textContent.includes("3/4"),
    "Meter lane did not follow change",
  );
  check(
    document
      .querySelector('[data-event-lane="pedal"]')
      .textContent.includes("Pedal up"),
    "Pedal lane did not follow release",
  );
}
