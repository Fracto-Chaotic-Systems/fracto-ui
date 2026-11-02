import { contexts, rms } from "./Capture.js";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (value, message) => {
  if (!value) throw new Error(message);
};
const button = (name) =>
  [...document.querySelectorAll("button")].find(
    (item) => item.textContent === name,
  );
const status = () =>
  document.querySelector('#page [role="status"]')?.textContent;
const panel = () => document.querySelector("[data-mixer-route]");
const choice = () => panel()?.querySelector("select");
function choose(program = 0, bank = 0) {
  const track = [
    0,
    176,
    0,
    bank,
    0,
    192,
    program,
    0,
    144,
    60,
    100,
    0xa5,
    0x40,
    128,
    60,
    0,
    0,
    255,
    47,
    0,
  ];
  const bytes = new Uint8Array([
    77,
    84,
    104,
    100,
    0,
    0,
    0,
    6,
    0,
    0,
    0,
    1,
    1,
    224,
    77,
    84,
    114,
    107,
    0,
    0,
    0,
    track.length,
    ...track,
  ]);
  const transfer = new DataTransfer();
  transfer.items.add(
    new File([bytes], "instrument.mid", { type: "audio/midi" }),
  );
  const input = document.querySelector('#page input[type="file"]');
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
function change(value) {
  Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value",
  ).set.call(choice(), value);
  choice().dispatchEvent(new Event("change", { bubbles: true }));
}
async function select_route(until) {
  await until(() => status() === "Ready to play.", "instrument ready");
  document.querySelector('[data-row-kind="notes"] button').click();
  await until(() => !!choice(), "instrument select");
}
export async function verify_instruments(until) {
  button("Return to music").click();
  await until(
    () => !!document.querySelector('#page input[type="file"]'),
    "instrument page",
  );
  choose();
  await select_route(until);
  check(
    choice().value === "grandb" && choice().options.length === 2,
    "Only verified piano and original should be listed",
  );
  check(
    !choice().querySelector('[value="original"]').disabled,
    "Piano original assignment unavailable",
  );
  const volume = panel().querySelector('input[aria-label="Volume"]');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(
    volume,
    "40",
  );
  volume.dispatchEvent(new Event("input", { bubbles: true }));
  await sleep(30);
  button("Play").click();
  await until(() => status() === "Playing.", "instrument playing");
  const context = contexts.at(-1),
    start = context.currentTime;
  await sleep(300);
  const active = rms(context, start + 0.05, context.currentTime - 0.03);
  check(active.rms > 0.0001, "Instrument produced no audio");
  const voices = context.scheduled_starts.length;
  change("original");
  await sleep(50);
  const stopped = context.currentTime;
  await sleep(250);
  const silent = rms(context, stopped + 0.03, stopped + 0.2);
  check(
    silent.samples > 0 && silent.peak < 0.000001,
    "Instrument change left audio playing",
  );
  check(
    status() !== "Playing." && context.scheduled_starts.length === voices,
    "Instrument change restarted playback",
  );
  check(
    panel().querySelector('input[aria-label="Volume"]').value === "40",
    "Instrument change reset mixer",
  );
  check(choice().value === "original", "Original assignment not retained");
  button("Play").click();
  await until(() => status() === "Playing.", "original replay");
  await sleep(200);
  check(
    context.scheduled_starts.length > voices,
    "Explicit Play did not restart assignment",
  );
  change("grandb");
  await sleep(50);
  check(status() !== "Playing.", "Override change did not stop");
  choose(12);
  await select_route(until);
  check(
    choice().value === "grandb" &&
      choice().querySelector('[value="original"]').disabled,
    "Unsupported original must be disabled",
  );
  check(
    panel().textContent.includes("File programs: 13") &&
      panel().textContent.includes("Playback sound: GrandB piano"),
    "Original/effective labels are misleading",
  );
  choose(0, 3);
  await select_route(until);
  check(
    choice().querySelector('[value="original"]').disabled &&
      panel().textContent.includes("3:0"),
    "Bank support incorrectly inferred",
  );
  button("Leave music").click();
  await until(() => context.state === "closed", "instrument cleanup");
  return {
    active,
    after_assignment_change: silent,
    explicit_play_required: true,
    mixer_preserved: true,
    unsupported_original_disabled: true,
    bank_checked: true,
    verified_choices_only: true,
    context_after_unmount: context.state,
  };
}
