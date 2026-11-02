import { contexts, wav } from "./Capture.js";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (value, message) => {
  if (!value) throw new Error(message);
};
const status = () =>
  document.querySelector('#page [role="status"]')?.textContent;
const button = (name) =>
  [...document.querySelectorAll("button")].find(
    (button) => button.textContent === name,
  );
const panel = () => document.querySelector("[data-mixer-route]");
const field = (name) => panel().querySelector(`input[aria-label="${name}"]`);
const toggle = (name) =>
  [...panel().querySelectorAll("label")]
    .find((label) => label.textContent.trim() === name)
    .querySelector("input");
const set_range = (name, value) => {
  const input = field(name);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(
    input,
    String(value),
  );
  input.dispatchEvent(new Event("input", { bubbles: true }));
};
async function select_route(index) {
  document.querySelectorAll('[data-row-kind="notes"] button')[index].click();
  await sleep(30);
}
function choose() {
  const tracks = [60, 72].map((pitch) => [
    0,
    144,
    pitch,
    100,
    0xa5,
    0x40,
    128,
    pitch,
    0,
    0,
    255,
    47,
    0,
  ]);
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
    1,
    0,
    2,
    1,
    224,
    ...tracks.flatMap((track) => [
      77,
      84,
      114,
      107,
      0,
      0,
      0,
      track.length,
      ...track,
    ]),
  ]);
  const input = document.querySelector('#page input[type="file"]'),
    transfer = new DataTransfer();
  transfer.items.add(new File([bytes], "two-track-mix.mid"));
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
async function measure(context) {
  await sleep(60);
  const start = context.currentTime;
  await sleep(140);
  const end = context.currentTime;
  let left = 0,
    right = 0,
    count = 0;
  for (const chunk of context.captured)
    for (let i = 0; i < chunk.left.length; i++) {
      const time = chunk.time + i / context.sampleRate;
      if (time >= start && time < end) {
        left += chunk.left[i] ** 2;
        right += chunk.right[i] ** 2;
        count++;
      }
    }
  check(count > 0, "No captured mixer audio");
  return {
    left: Math.sqrt(left / count),
    right: Math.sqrt(right / count),
    rms: Math.sqrt((left + right) / (2 * count)),
  };
}
function defaults() {
  return (
    field("Volume").value === "100" &&
    field("Pan").value === "0" &&
    !toggle("Mute").checked &&
    !toggle("Solo").checked
  );
}
export async function verify_mixer(until) {
  button("Return to music").click();
  await sleep(40);
  choose();
  await until(() => status() === "Ready to play.", "mixer fixture");
  await select_route(1);
  toggle("Mute").click();
  await select_route(0);
  check(defaults(), "Editing one track changed another on the same channel");
  button("Play").click();
  await until(() => status() === "Playing.", "mixer playing");
  const context = contexts.at(-1);
  const baseline = await measure(context);
  check(baseline.rms > 0.0001, "Baseline mixer output silent");
  set_range("Volume", 20);
  const reduced = await measure(context);
  check(
    reduced.rms < baseline.rms * 0.5,
    "Volume did not reduce active output",
  );
  set_range("Volume", 100);
  set_range("Pan", -100);
  const left = await measure(context);
  check(
    left.left > left.right * 100 && left.left > 0.0001,
    "Hard-left pan did not route audio left",
  );
  set_range("Pan", 100);
  const right = await measure(context);
  check(
    right.right > right.left * 100 && right.right > 0.0001,
    "Hard-right pan did not route audio right",
  );
  set_range("Pan", 0);
  toggle("Mute").click();
  const muted = await measure(context);
  check(muted.rms === 0, "Mute did not silence active output");
  toggle("Mute").click();
  await select_route(1);
  toggle("Mute").click();
  await select_route(0);
  toggle("Solo").click();
  toggle("Mute").click();
  const muted_solo = await measure(context);
  check(
    muted_solo.rms === 0,
    "Muted solo route did not suppress non-solo tracks",
  );
  await select_route(1);
  toggle("Solo").click();
  const second_solo = await measure(context);
  check(second_solo.rms > 0.0001, "Second solo did not play independently");
  toggle("Mute").click();
  const both_muted = await measure(context);
  check(both_muted.rms === 0, "Mute failed with multiple solos");
  button("Reset mix").click();
  await sleep(30);
  check(defaults(), "Reset mix did not reset the selected route");
  await select_route(0);
  check(defaults(), "Reset mix did not reset every route");
  const reset = await measure(context);
  check(reset.rms > 0.0001, "Reset mix did not restore sound");
  check(
    context.scheduled_starts.length === 2,
    "Mixer edits restarted or duplicated voices",
  );
  set_range("Volume", 37);
  set_range("Pan", -50);
  toggle("Solo").click();
  choose();
  await until(() => status() === "Ready to play.", "mixer replacement");
  await select_route(0);
  check(defaults(), "Replacement retained previous mix overrides");
  const replaced = await measure(context);
  check(replaced.rms === 0, "Replacement left mixer output playing");
  button("Play").click();
  await until(() => status() === "Playing.", "mixer restart");
  button("Stop").click();
  const stopped = await measure(context);
  check(stopped.rms === 0, "Stop left mixer bus output");
  button("Leave music").click();
  await until(() => context.state === "closed", "mixer context cleanup");
  const report = {
    baseline,
    reduced,
    hard_left: left,
    hard_right: right,
    muted,
    muted_solo,
    second_solo,
    both_muted,
    reset,
    after_replacement: replaced,
    after_stop: stopped,
    independent_tracks_shared_channel: true,
    reset_all: true,
    replacement_resets_mix: true,
    no_voice_restart: true,
    context_after_unmount: context.state,
  };
  await fetch("/mixer_audio", { method: "POST", body: wav(context) });
  return report;
}
