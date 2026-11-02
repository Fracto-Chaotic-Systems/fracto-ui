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
  const response = await fetch("/api/asset/instruments", {
    credentials: "include",
  });
  check(response.ok, "Catalog unavailable in assignment verification");
  const catalog = await response.json();
  const legacy = catalog.instruments.filter(
    (item) => (item.library_id ?? "legacy") === "legacy",
  );
  await until(
    () =>
      document.querySelector('select[aria-label="Sound library"]')?.value ===
      "fluidr3-gm",
    "FluidR3 default library",
  );
  check(
    choice().value === "original",
    "Default MIDI assignment must follow FluidR3",
  );
  check(choice().options.length === 130, "Default FluidR3 inventory");
  const library_control = document.querySelector(
    'select[aria-label="Sound library"]',
  );
  Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value",
  ).set.call(library_control, "legacy");
  library_control.dispatchEvent(new Event("change", { bubbles: true }));
  await until(
    () => choice()?.options.length === legacy.length + 2,
    "Legacy selection",
  );
  change("grandb");
  await sleep(30);
  await until(
    () => choice()?.options.length === legacy.length + 2,
    "catalog instrument options",
  );
  check(
    choice().value === "grandb",
    "Discovery changed the default assignment",
  );
  for (const item of legacy) {
    const option = [...choice().options].find(
      (option) => option.value === `asset-${item.id}`,
    );
    check(
      option &&
        option.disabled === !(item.enabled && item.available) &&
        option.textContent.includes(item.name),
      "Inventory name or playback availability differs from catalog",
    );
  }
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
  let catalog_sound_selected = false;
  const flute = [...choice().options].find(
    (option) => option.value === "asset-flute",
  );
  if (flute && !flute.disabled) {
    change("asset-flute");
    await sleep(50);
    check(
      panel().textContent.includes("Playback sound: Flute"),
      "Catalog effective name missing",
    );
    button("Play").click();
    await until(() => status() === "Playing.", "catalog instrument playback");
    const began = context.currentTime;
    await until(
      () => context.currentTime >= began + 0.35,
      "catalog audio clock",
    );
    await until(
      () => rms(context, began + 0.1, began + 0.25).samples > 0,
      "catalog capture",
    );
    check(
      rms(context, began + 0.1, began + 0.25).rms > 0.00001,
      "Selected catalog source was silent",
    );
    change("grandb");
    await sleep(50);
    catalog_sound_selected = true;
  }
  choose(12);
  await select_route(until);
  check(
    choice().value === "original" &&
      choice().querySelector('[value="original"]').disabled,
    "Unsupported original must be disabled",
  );
  check(
    panel().textContent.includes("File programs: 13") &&
      panel().textContent.includes(
        "Playback sound: Unavailable for these notes",
      ),
    "Original/effective labels are misleading",
  );
  choose(0, 3);
  await select_route(until);
  check(
    choice().querySelector('[value="original"]').disabled &&
      panel().textContent.includes("3:0"),
    "Bank support incorrectly inferred",
  );

  // Exercise the production library selector and GM assignment path.
  choose(73);
  await select_route(until);
  const library = () =>
    document.querySelector('select[aria-label="Sound library"]');
  const switch_library = (value) => {
    Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      "value",
    ).set.call(library(), value);
    library().dispatchEvent(new Event("change", { bubbles: true }));
  };
  switch_library("fluidr3-gm");
  await until(
    () => choice()?.value === "original",
    "FluidR3 original assignment",
  );
  check(choice().options.length === 130, "FluidR3 scoped choices");
  check(
    !choice().querySelector('[value="original"]').disabled,
    "GM flute unavailable",
  );
  check(
    panel().textContent.includes("Playback sound: Flute"),
    "GM flute effective label",
  );
  button("Play").click();
  await until(() => status() === "Playing.", "FluidR3 GM playback");
  const fluid_start = context.currentTime;
  await until(
    () => context.currentTime > fluid_start + 0.4,
    "FluidR3 audio clock",
  );
  await until(
    () => rms(context, fluid_start + 0.1, fluid_start + 0.3).samples > 0,
    "FluidR3 capture",
  );
  const fluid_audio = rms(context, fluid_start + 0.1, fluid_start + 0.3);
  check(fluid_audio.rms > 0.00001, "FluidR3 output silent");
  switch_library("legacy");
  await until(() => status() !== "Playing.", "library change Stop");
  const fluid_stopped = context.currentTime;
  await sleep(250);
  check(
    rms(context, fluid_stopped + 0.03, fluid_stopped + 0.2).peak < 0.000001,
    "Library change left sound playing",
  );
  check(
    choice().value === "original" &&
      choice().querySelector('[value="original"]').disabled,
    "Unsupported original silently substituted",
  );
  change("asset-flute");
  await sleep(40);
  switch_library("fluidr3-gm");
  await until(() => library().value === "fluidr3-gm", "switch back");
  check(choice().value === "asset-flute", "Cross-library override lost");
  button("Refresh libraries").click();
  await until(() => !button("Refresh libraries").disabled, "catalog refresh");
  check(
    library().value === "fluidr3-gm" && choice().value === "asset-flute",
    "Refresh lost selection",
  );
  choose(73);
  await select_route(until);
  check(
    library().value === "fluidr3-gm" && choice().value === "original",
    "Replacement lost selected library",
  );
  button("Leave music").click();
  await until(() => context.state === "closed", "instrument cleanup");
  return {
    fluidr3_default_original_assignment: true,
    fluid_audio,
    library_switch_stop: true,
    library_refresh_and_replacement: true,
    cross_library_override_retained: true,
    active,
    after_assignment_change: silent,
    explicit_play_required: true,
    mixer_preserved: true,
    unsupported_original_disabled: true,
    bank_checked: true,
    playable_choices_verified_only: true,
    catalog_entries_rendered: catalog.instruments.length,
    availability_matches_catalog: true,
    catalog_sound_selected,
    context_after_unmount: context.state,
  };
}
