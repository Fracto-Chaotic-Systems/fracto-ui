import React, { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import GamesMusic from "../../src/pages/games/GamesMusic.jsx";
import AppText from "../../src/AppText.jsx";
import { APP_GAMES_TEXT } from "../../src/text/GamesText.jsx";
import { events_from_midi } from "../../src/pages/games/music/MidiEvents.js";
import { midi, midi_file } from "./fixtures.js";
import { contexts, rms, wav } from "./Capture.js";
import ImportProbe, { import_player } from "./ImportProbe.jsx";
AppText.initialize(APP_GAMES_TEXT);
document.body.style.fontFamily = "Arial, sans-serif";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const status = () =>
  document.querySelector('#page [role="status"]')?.textContent;
const click = (name) => {
  const button = [...document.querySelectorAll("button")].find(
    (button) => button.textContent === name,
  );
  assert(button && !button.disabled, `Button unavailable: ${name}`);
  button.click();
};
async function until(check, label) {
  for (let i = 0; i < 400; i++) {
    if (check()) return;
    await sleep(25);
  }
  throw new Error(`Timed out: ${label}`);
}
function select() {
  const input = document.querySelector('#page input[type="file"]');
  const transfer = new DataTransfer();
  transfer.items.add(midi_file("timing-and-sustain.mid"));
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
const import_state = () =>
  JSON.parse(document.getElementById("import-state").textContent);
async function import_checks() {
  let resolve_old;
  const old = new Promise((resolve) => {
    resolve_old = resolve;
  });
  const first = import_player.open_file({
    name: "old.mid",
    size: midi.length,
    arrayBuffer: () => old,
  });
  await import_player.open_file(midi_file("new.mid"));
  resolve_old(midi.buffer);
  await first;
  await until(() => import_state().name === "new.mid", "latest import wins");
  let resolve_stop;
  const delayed = new Promise((resolve) => {
    resolve_stop = resolve;
  });
  const pending = import_player.open_file({
    name: "cancelled.mid",
    size: midi.length,
    arrayBuffer: () => delayed,
  });
  import_player.stop();
  resolve_stop(midi.buffer);
  await pending;
  await sleep(50);
  assert(
    !import_state().loaded && !import_state().reading,
    "Stop must cancel a pending file read",
  );
  await import_player.open_file({
    name: "bad.mid",
    size: 1,
    arrayBuffer: async () => {
      throw new Error("read denied");
    },
  });
  await until(
    () => import_state().error === "file_read_failed",
    "file read error",
  );
  await import_player.open_file(midi_file("recovered.mid"));
  await until(
    () => import_state().name === "recovered.mid",
    "file read recovery",
  );
  return {
    latest_file_wins: true,
    stop_during_read: true,
    read_error_recovery: true,
  };
}
async function run() {
  document.getElementById("report").textContent = "Running…";
  try {
    const imports = await import_checks();
    const song = events_from_midi(midi);
    assert(
      song.notes.length === 6 && Math.abs(song.duration_seconds - 1.5) < 1e-9,
      "Tempo/sustain fixture contract",
    );
    select();
    await until(() => status() === "Ready to play.", "ready");
    click("Play");
    await until(() => status() === "Playing.", "playing");
    const context = contexts.at(-1),
      started = context.currentTime;
    assert(context.state === "running", "Audio context is not running");
    await sleep(900);
    const stopped = context.currentTime;
    click("Stop");
    await sleep(300);
    const active = rms(context, started + 0.1, stopped - 0.05);
    const silent = rms(context, stopped + 0.06, stopped + 0.25);
    assert(
      active.samples > 0 && active.rms > 0.0001,
      "Playback output is silent",
    );
    assert(
      silent.samples > 0 && silent.peak < 0.000001,
      "Stop left audible output",
    );
    click("Play");
    await until(() => status() === "Playing.", "replay");
    await until(() => status() === "Playback complete.", "natural completion");
    click("Play");
    await until(() => status() === "Playing.", "replacement start");
    await sleep(150);
    select();
    await until(() => status() === "Ready to play.", "replacement");
    const replacement = context.currentTime;
    await sleep(200);
    const replacement_silence = rms(
      context,
      replacement + 0.05,
      replacement + 0.15,
    );
    assert(
      replacement_silence.samples > 0 && replacement_silence.peak < 0.000001,
      "Replacement left audible output",
    );
    click("Play");
    await until(() => status() === "Playing.", "navigation start");
    await sleep(150);
    click("Leave music");
    await until(() => context.state === "closed", "context closed on unmount");
    await sleep(100);
    const report = {
      pass: true,
      imports,
      notes: song.notes.map((note) => ({
        pitch: note.pitch,
        start: note.start_seconds,
        end: note.end_seconds,
      })),
      duration_seconds: song.duration_seconds,
      sample_rate: context.sampleRate,
      active,
      after_stop: silent,
      after_replacement: replacement_silence,
      context_after_unmount: context.state,
      natural_completion: true,
      replay: true,
      capture_seconds:
        context.captured.reduce(
          (count, chunk) => count + chunk.left.length,
          0,
        ) / context.sampleRate,
    };
    await fetch("/audio", { method: "POST", body: wav(context) });
    await fetch("/report", {
      method: "POST",
      body: JSON.stringify(report, null, 2),
    });
    document.getElementById("report").textContent = JSON.stringify(
      report,
      null,
      2,
    );
  } catch (error) {
    const report = { pass: false, error: error.message, stack: error.stack };
    await fetch("/report", {
      method: "POST",
      body: JSON.stringify(report, null, 2),
    });
    document.getElementById("report").textContent = JSON.stringify(
      report,
      null,
      2,
    );
  }
}
function Harness() {
  const [show, set_show] = useState(true);
  return (
    <>
      <nav>
        <button onClick={run}>Run playback verification</button>
        <button onClick={() => set_show(!show)}>
          {show ? "Leave music" : "Return to music"}
        </button>
      </nav>
      <div id="page">{show ? <GamesMusic /> : <p>Another page</p>}</div>
      <ImportProbe />
      <pre id="report">Not run</pre>
    </>
  );
}
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
