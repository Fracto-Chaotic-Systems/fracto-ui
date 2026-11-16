import MidiPlaybackController from "../../src/pages/games/music/MidiPlaybackController.js";
import { load_instrument_catalog } from "../../src/pages/games/music/MidiInstrumentCatalog.js";
const status = document.querySelector("#status");
const results = {};
const check = (value, message) => {
  if (!value) throw new Error(message);
};
const save = async () => {
  status.textContent = JSON.stringify(results, null, 2);
  await fetch("/long-piece-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(results),
  });
};
async function verify(mode, bytes) {
  let native;
  let player;
  let analyser;
  let ticks = 0;
  let peak = 0;
  let nonzero = 0;
  const started = performance.now();
  const row = (results[mode] = { status: "loading", output_muted: true });
  try {
    player = new MidiPlaybackController({
      catalog_loader: (signal) =>
        load_instrument_catalog(`${location.origin}/api/asset/instruments`, {
          signal,
        }),
      create_context: () => {
        native = new AudioContext({ sampleRate: 48000 });
        const output = native.createGain();
        output.gain.value = 0;
        output.connect(native.destination);
        return new Proxy(native, {
          get(target, key) {
            if (key === "destination") return output;
            const value = Reflect.get(target, key, target);
            return typeof value === "function" ? value.bind(target) : value;
          },
        });
      },
    });
    player.load(bytes);
    check(await player.refresh_catalog(), "Catalog discovery failed");
    check(player.set_library("fluidr3-gm"), "FluidR3 not selectable");
    for (const route of player.instruments.routes.keys())
      check(
        player.set_instrument(
          route,
          mode === "fluidr3-original" ? "original" : "grandb",
        ),
        "Assignment rejected",
      );
    row.notes = player.song.notes.length;
    row.duration_seconds = player.song.duration_seconds;
    row.assignments = player.instruments.assignments;
    check(await player.play(), `Play failed: ${player.snapshot().error?.code}`);
    row.resolved_instruments = [
      ...new Set(
        player.sample_session.samples.map((sample) => sample.instrument_id),
      ),
    ];
    if (mode === "fluidr3-original")
      check(
        row.resolved_instruments.every((id) =>
          id.startsWith("asset-fluidr3-gm-"),
        ),
        "Unexpected Legacy override",
      );
    else
      check(
        row.resolved_instruments.every((id) => id === "grandb"),
        "GrandB override did not resolve",
      );
    analyser = native.createAnalyser();
    analyser.fftSize = 2048;
    player.master.connect(analyser);
    const frames = new Float32Array(analyser.fftSize);
    await new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        const snapshot = player.snapshot();
        analyser.getFloatTimeDomainData(frames);
        const level = frames.reduce(
          (maximum, value) => Math.max(maximum, Math.abs(value)),
          0,
        );
        peak = Math.max(peak, level);
        if (level > 0.00001) nonzero++;
        Object.assign(row, snapshot, {
          wall_seconds: (performance.now() - started) / 1000,
          measured_peak: peak,
          signal_observations: nonzero,
        });
        if (++ticks % 25 === 0) void save();
        if (
          snapshot.status === "error" ||
          (performance.now() - started) / 1000 >
            player.song.duration_seconds + 180
        ) {
          clearInterval(timer);
          reject(
            new Error(`Playback failed or timed out: ${snapshot.error?.code}`),
          );
        } else if (snapshot.status === "completed") {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
    check(
      row.playback_stats.scheduled === row.notes,
      "Not every note was scheduled",
    );
    check(row.playback_stats.skipped === 0, "Scheduler skipped notes");
    check(
      row.position_seconds === row.duration_seconds,
      "Did not reach song end",
    );
    check(
      row.sample_memory.peak_managed_bytes <= player.cache.max_bytes,
      "Managed memory budget exceeded",
    );
    check(
      row.sample_memory.peak_decode_jobs <= 2,
      "Decoder concurrency exceeded",
    );
    check(nonzero > 100 && peak > 0.001, "No sustained native audio signal");
    row.pass = true;
  } catch (error) {
    row.pass = false;
    row.failure = error.message;
  } finally {
    analyser?.disconnect();
    await player?.dispose();
    row.cleanup = {
      context_closed: native?.state === "closed",
      decoded_bytes: player?.cache.bytes,
      pinned_assets: player?.sample_session?.pins.size,
      active_decodes: player?.cache.budget.active,
    };
    if (
      !row.cleanup.context_closed ||
      row.cleanup.decoded_bytes !== 0 ||
      row.cleanup.pinned_assets !== 0 ||
      row.cleanup.active_decodes !== 0
    ) {
      row.pass = false;
      row.failure ??= "Playback resources were not fully released";
    }
    await save();
  }
}
document.querySelector("#run").onclick = async (event) => {
  event.target.disabled = true;
  try {
    const bytes = new Uint8Array(
      await (await fetch("/target-midi")).arrayBuffer(),
    );
    await Promise.all([
      verify("fluidr3-original", bytes),
      verify("grandb-override", bytes),
    ]);
    results.finished = true;
    results.pass =
      results["fluidr3-original"].pass && results["grandb-override"].pass;
    await save();
  } catch (error) {
    results.failure = error.message;
    await save();
  }
};
