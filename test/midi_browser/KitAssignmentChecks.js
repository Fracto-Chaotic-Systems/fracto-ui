import { contexts, rms } from "./Capture.js";
import { resource_counts } from "./ResourceChecks.js";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (value, message) => {
  if (!value) throw new Error(message);
};
const button = (name) =>
  [...document.querySelectorAll("button")].find((b) => b.textContent === name);
const panel = () => document.querySelector("[data-mixer-route]");
const choice = () => panel()?.querySelector("select");
const status = () =>
  document.querySelector('#page [role="status"]')?.textContent;
function change(control, value) {
  const prototype =
    control instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value").set.call(control, value);
  control.dispatchEvent(new Event("change", { bubbles: true }));
}
function load(program = 0, bank = 0, pitch = 46) {
  const track = [
    0,
    0xb9,
    0,
    bank,
    0,
    0xc9,
    program,
    0,
    0x99,
    pitch,
    127,
    1,
    0x89,
    pitch,
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
    new File([bytes], "drum-kit-assignment.mid", { type: "audio/midi" }),
  );
  const input = document.querySelector('#page input[type="file"]');
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
async function select_row(until) {
  await until(() => status() === "Ready to play.", "kit file ready");
  document.querySelector('[data-row-kind="notes"] button').click();
  await until(() => !!choice(), "kit selector");
}
export async function verify_kit_assignment(until) {
  if (button("Return to music")) button("Return to music").click();
  await until(
    () => !!document.querySelector('#page input[type="file"]'),
    "music mounted",
  );
  load();
  await select_row(until);
  await until(
    () =>
      [...choice().options].some(
        (o) => o.value === "asset-fluidr3-percussion-kit-standard",
      ),
    "kit inventory",
  );
  const id = "asset-fluidr3-percussion-kit-standard";
  const options = [...choice().options];
  check(
    choice().labels[0].textContent.startsWith("Drum kit"),
    "Percussion label missing",
  );
  check(options.length === 32, "Expected Original plus 31 audited kits");
  check(
    options.filter((o) => !o.disabled).length === 2,
    "Only Original and Standard should be available",
  );
  check(
    !options.some(
      (o) => o.value === "grandb" || o.value.includes("acoustic-grand"),
    ),
    "Melodic patches leaked into kit choices",
  );
  check(
    choice().value === "original" &&
      panel().textContent.includes("Playback sound: Standard"),
    "Original Standard assignment missing",
  );
  change(panel().querySelector('input[aria-label="Volume"]'), "40");
  button("Play").click();
  await until(() => status() === "Playing.", "original drum playback");
  const context = contexts.at(-1);
  await context.capture_ready;
  const began = context.scheduled_starts[0].when;
  await until(() => context.currentTime > began + 0.25, "kit output clock");
  const active = rms(context, began + 0.03, began + 0.2);
  check(active.samples > 0 && active.rms > 1e-6, "Assigned kit output silent");
  const stopped = context.currentTime;
  change(choice(), id);
  await until(() => status()?.startsWith("Stopped."), "kit override stop");
  await sleep(250);
  const after_change = rms(context, stopped + 0.04, stopped + 0.2);
  check(
    after_change.samples > 0 && after_change.peak < 1e-7,
    "Kit change left audio",
  );
  check(
    panel().querySelector('input[aria-label="Volume"]').value === "40",
    "Kit change reset mix",
  );
  check(
    !button("Play").disabled && button("Stop").disabled,
    "Kit change restarted playback",
  );
  button("Play").click();
  await until(() => status() === "Playing.", "manual kit playback");
  change(
    document.querySelector('select[aria-label="Sound library"]'),
    "legacy",
  );
  await until(() => status()?.startsWith("Stopped."), "library change stop");
  check(
    choice().value === id &&
      [...choice().options]
        .find((o) => o.value === id)
        .textContent.includes("FluidR3"),
    "Compatible cross-library kit lost",
  );
  button("Refresh libraries").click();
  await until(() => !button("Refresh libraries").disabled, "catalog refresh");
  check(choice().value === id, "Catalog refresh lost kit override");
  change(
    document.querySelector('select[aria-label="Sound library"]'),
    "fluidr3-gm",
  );
  change(choice(), "original");
  check(choice().value === "original", "Original restoration failed");
  load(8, 1);
  await select_row(until);
  check(
    choice().querySelector('[value="original"]').disabled,
    "Unsupported file kit bank/program silently mapped",
  );
  check(
    !choice().querySelector(`[value="${id}"]`).disabled,
    "Explicit Standard override unavailable",
  );
  change(choice(), id);
  button("Play").click();
  await until(
    () => status() === "Playing.",
    "bank/program kit override playback",
  );
  button("Stop").click();
  load(0, 0, 26);
  await select_row(until);
  check(
    [...choice().options].every((o) => o.disabled),
    "Unsupported drum note selectable",
  );
  button("Leave music").click();
  await until(() => context.state === "closed", "kit page cleanup");
  await sleep(50);
  const cleanup = resource_counts(contexts);
  check(
    Object.values(cleanup).every((v) => v === 0),
    "Kit assignment leaked resources",
  );
  // Leave the reviewed selector visible without starting another audio context.
  button("Return to music").click();
  await until(
    () => !!document.querySelector('#page input[type="file"]'),
    "kit review page",
  );
  load();
  await select_row(until);
  await until(() => choice().options.length === 32, "review kit inventory");
  change(choice(), id);
  return {
    pass: true,
    options: 32,
    selectable_kits: 1,
    active,
    after_assignment_change: after_change,
    melodic_choices_excluded: true,
    mix_preserved: true,
    explicit_play_required: true,
    cross_library_override_retained: true,
    refresh_retained: true,
    original_restored: true,
    unsupported_bank_program_override: true,
    unsupported_note_disabled: true,
    cleanup,
  };
}
