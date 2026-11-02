import test from "node:test";
import assert from "node:assert/strict";
import MidiPlaybackController from "../src/pages/games/music/MidiPlaybackController.js";
import {
  deferred,
  flush,
  FakeContext,
  fake_timers,
  response,
  midi_file,
} from "./midi_audio_fakes.js";

const setup = (options = {}) => {
  const context = new FakeContext();
  const timers = fake_timers(context);
  const statuses = [];
  const player = new MidiPlaybackController({
    create_context: () => context,
    fetch_sample: async () => response(),
    on_status: (status) => statuses.push(status.status),
    ...timers,
    ...options,
  });
  return { context, timers, statuses, player };
};

test("load is silent; play, completion, replay and Stop reuse one graph and sample", async () => {
  const { player, context, timers } = setup();
  player.load(midi_file());
  assert.equal(player.status, "ready");
  assert.equal(player.context, null);
  assert.equal(await player.play(), true);
  assert.equal(context.sources.length, 1);
  assert.equal(context.decoded, 1);
  assert.equal(timers.timers.size, 1);
  assert.equal(await player.play(), false);
  timers.advance(2);
  assert.equal(player.status, "completed");
  assert.equal(player.snapshot().position_seconds, 0.5);
  assert.equal(timers.timers.size, 0);
  assert.equal(context.sources[0].disconnected, true);
  assert.equal(await player.play(), true);
  assert.equal(context.decoded, 1);
  assert.equal(context.gains[0].connections.length, 1);
  player.stop();
  assert.equal(player.status, "stopped");
  assert.equal(context.sources[1].stopped, true);
  assert.equal(context.sources[1].disconnected, true);
  assert.equal(timers.timers.size, 0);
  assert.equal(context.gains[0].gain.value, 0);
  assert.equal(player.snapshot().position_seconds, 0);
  await player.dispose();
  assert.equal(context.close_count, 1);
});

test("Stop while resume is pending cannot start audio later", async () => {
  const resume = deferred();
  const { player, context } = setup();
  context.resume = () => resume.promise;
  player.load(midi_file());
  const pending = player.play();
  player.stop();
  resume.resolve();
  assert.equal(await pending, false);
  assert.equal(context.sources.length, 0);
  assert.equal(player.status, "stopped");
});

test("Stop during sample fetch aborts and retry succeeds without a stale source", async () => {
  const fetch = deferred();
  let signal;
  let requests = 0;
  const { player, context } = setup({
    fetch_sample: async (_url, options) => {
      signal = options.signal;
      return ++requests === 1 ? fetch.promise : response();
    },
  });
  player.load(midi_file());
  const pending = player.play();
  await flush();
  player.stop();
  assert.equal(signal.aborted, true);
  assert.equal(await player.play(), true);
  fetch.resolve(response());
  assert.equal(await pending, false);
  assert.equal(context.sources.length, 1);
  assert.equal(player.status, "playing");
  await player.dispose();
});

test("replacing a file during decoding invalidates its playback request", async () => {
  const decode = deferred();
  const { player, context } = setup();
  context.decodeAudioData = () => decode.promise;
  player.load(midi_file());
  const pending = player.play();
  await flush();
  player.load(midi_file());
  decode.resolve(context.buffer);
  assert.equal(await pending, false);
  assert.equal(player.cache.buffers.size, 0);
  assert.equal(context.sources.length, 0);
  assert.equal(player.status, "ready");
});

test("dispose during pending decode closes once and never resurrects buffers or callbacks", async () => {
  const decode = deferred();
  const { player, context, statuses } = setup();
  context.decodeAudioData = () => decode.promise;
  player.load(midi_file());
  const pending = player.play();
  await flush();
  await player.dispose();
  const count = statuses.length;
  decode.resolve(context.buffer);
  assert.equal(await pending, false);
  assert.equal(player.cache.buffers.size, 0);
  assert.equal(context.sources.length, 0);
  assert.equal(context.close_count, 1);
  await player.dispose();
  assert.equal(await player.play(), false);
  assert.equal(statuses.length, count);
  assert.throws(() => player.load(midi_file()), /disposed/);
});

test("resume, download and scheduling failures leave the player stopped and report errors", async () => {
  for (const failure of ["resume", "download", "schedule"]) {
    const { player, context, timers } = setup({
      fetch_sample: async () =>
        failure === "download" ? { ok: false, status: 404 } : response(),
    });
    if (failure === "resume")
      context.resume = async () => {
        throw new Error("blocked");
      };
    if (failure === "schedule")
      context.createBufferSource = () => {
        throw new Error("source failed");
      };
    player.load(midi_file());
    assert.equal(await player.play(), false);
    assert.equal(player.status, "error");
    assert.equal(context.gains[0].gain.value, 0);
    assert.equal(timers.timers.size, 0);
    assert.ok(player.snapshot().error);
    await player.dispose();
  }
});

test("invalid replacement clears the previous song and empty Play is actionable", async () => {
  const { player, context } = setup();
  assert.equal(await player.play(), false);
  assert.equal(player.snapshot().error.code, "no_song");
  player.load(midi_file());
  await player.play();
  assert.throws(() => player.load(new Uint8Array()), /Truncated/);
  assert.equal(context.sources[0].stopped, true);
  assert.equal(player.song, null);
  assert.equal(player.status, "error");
  await player.dispose();
});

test("natural sample exhaustion is explicit for long notes", async () => {
  const { player, context } = setup();
  player.load(midi_file());
  context.buffer = { duration: 0.1, length: 4800, numberOfChannels: 1 };
  assert.equal(await player.play(), true);
  assert.deepEqual(player.warnings, [
    { code: "sample_shorter_than_note", count: 1 },
  ]);
  assert.ok(Math.abs(context.sources[0].stop_at - 0.15) < 1e-9);
  await player.dispose();
});

test("controller keeps same-pitch channel voices separate through MIDI sustain and note-off", async () => {
  const events = [
    0, 0xb0, 64, 127, 0, 0x90, 60, 100, 0, 0x91, 60, 100, 0x81, 0x70, 0x80, 60,
    0, 0x81, 0x70, 0x81, 60, 0, 0x81, 0x70, 0xb0, 64, 0, 0, 255, 47, 0,
  ];
  const bytes = new Uint8Array([...midi_file().slice(0, 22), ...events]);
  bytes[21] = events.length;
  const { player, context } = setup();
  player.load(bytes);
  assert.deepEqual(
    player.song.notes.map((n) => n.end_seconds),
    [0.75, 0.5],
  );
  await player.play();
  assert.equal(context.sources.length, 2);
  assert.equal(context.decoded, 1);
  assert.ok(
    Math.abs(context.sources[0].stop_at - context.sources[1].stop_at - 0.25) <
      1e-9,
  );
  player.stop();
  assert.ok(
    context.sources.every((source) => source.stopped && source.disconnected),
  );
  await player.dispose();
});

test("unload cancels pending playback, clears the song and cache, and keeps the context reusable", async () => {
  const { player, context, timers } = setup();
  player.load(midi_file());
  await player.play();
  player.unload();
  assert.equal(player.song, null);
  assert.equal(player.cache.buffers.size, 0);
  assert.equal(player.status, "idle");
  assert.equal(timers.timers.size, 0);
  assert.equal(context.sources[0].stopped, true);
  assert.equal(context.close_count, 0);
  player.load(midi_file());
  assert.equal(await player.play(), true);
  await player.dispose();
});

test("repeated Play/Stop cycles leave no timers or connected voice nodes", async () => {
  const { player, context, timers } = setup();
  player.load(midi_file());
  for (let index = 0; index < 50; index++) {
    assert.equal(await player.play(), true);
    assert.equal(await player.play(), false);
    player.stop();
    assert.equal(timers.timers.size, 0);
  }
  assert.equal(context.sources.length, 50);
  assert.equal(context.decoded, 1);
  assert.ok(
    context.sources.every(
      (source) =>
        source.stopped && source.disconnected && source.onended === null,
    ),
  );
  assert.ok(context.gains.slice(1).every((gain) => gain.disconnected));
  assert.ok(context.pans.every((pan) => pan.disconnected));
  await player.dispose();
  assert.equal(context.close_count, 1);
});

test("clock snapshots distinguish scheduling lead-in and give each replay a new identity", async () => {
  const { player, context, timers } = setup();
  player.load(midi_file());
  await player.play();
  const first = player.snapshot();
  assert.equal(first.clock_started, false);
  timers.advance(0.1);
  assert.equal(player.snapshot().clock_started, true);
  assert.ok(Math.abs(player.snapshot().position_seconds - 0.05) < 1e-9);
  player.stop();
  assert.equal(player.snapshot().clock_started, false);
  await player.play();
  assert.notEqual(player.snapshot().playback_id, first.playback_id);
  assert.equal(player.snapshot().position_seconds, 0);
  assert.equal(player.snapshot().clock_started, false);
  await player.dispose();
});

test("completion releases routes and stale callbacks cannot stop the next playback", async () => {
  const { player, context, timers } = setup();
  player.load(midi_file());
  const id = Object.keys(player.mixer.mix)[0];
  player.set_mix(id, { volume: 0.4, pan: -0.5, solo: true });
  player.set_instrument(id, "original");
  await player.play();
  const old = player.scheduler;
  timers.advance(2);
  assert.equal(player.status, "completed");
  assert.equal(
    player.snapshot().position_seconds,
    player.song.duration_seconds,
  );
  assert.equal(player.mixer.buses.size, 0);
  assert.equal(old.voices.size, 0);
  assert.equal(timers.timers.size, 0);
  assert.ok(context.gains.slice(1).every((node) => node.disconnected));
  assert.ok(context.pans.every((node) => node.disconnected));
  assert.equal(player.mixer.mix[id].volume, 0.4);
  assert.equal(player.instruments.assignments[id], "original");
  await player.play();
  const next = player.scheduler,
    bus = player.mixer.buses.get(id);
  old.on_complete();
  old.on_error(new Error("late error"));
  old.pump();
  assert.equal(player.status, "playing");
  assert.equal(player.scheduler, next);
  assert.equal(player.mixer.buses.get(id), bus);
  assert.equal(bus.gain.disconnected, false);
  assert.equal(context.decoded, 1);
  await player.dispose();
  assert.equal(timers.timers.size, 0);
  assert.equal(player.cache.bytes, 0);
  assert.equal(player.mixer.buses.size, 0);
});

test("mixed assignment, replacement and playback cycles retain no old audio graph", async () => {
  const { player, context, timers, statuses } = setup();
  for (let cycle = 0; cycle < 20; cycle++) {
    player.load(midi_file());
    const id = Object.keys(player.mixer.mix)[0];
    player.set_mix(id, { mute: true, solo: true, volume: 0.2, pan: 1 });
    await player.play();
    const old = player.scheduler;
    assert.equal(player.set_instrument(id, "original"), true);
    assert.equal(old.voices.size, 0);
    assert.equal(timers.timers.size, 0);
    assert.equal(player.mixer.buses.size, 0);
    await player.play();
    player.set_mix(id, { mute: false });
    if (cycle % 2) player.unload();
    else assert.throws(() => player.load(new Uint8Array()), /Truncated/);
    assert.equal(player.song, null);
    assert.equal(player.mixer.buses.size, 0);
    assert.deepEqual(player.instruments.assignments, {});
    assert.equal(player.cache.bytes, 0);
    assert.equal(timers.timers.size, 0);
    assert.ok(
      context.sources.every(
        (source) =>
          source.stopped && source.disconnected && source.onended === null,
      ),
    );
    assert.ok(context.gains.slice(1).every((node) => node.disconnected));
    assert.ok(context.pans.every((node) => node.disconnected));
  }
  await player.dispose();
  const count = statuses.length;
  player.stop();
  player.reset_mix();
  assert.equal(await player.play(), false);
  assert.equal(statuses.length, count);
  assert.equal(context.close_count, 1);
});

test("stalled audio resume becomes a retryable error and late resume cannot start sources", async () => {
  const pending = deferred(),
    context = new FakeContext();
  context.resume = () => pending.promise;
  const { player } = setup({
    create_context: () => context,
    resume_timeout_ms: 10,
  });
  player.load(midi_file());
  assert.equal(await player.play(), false);
  assert.equal(player.snapshot().error.code, "audio_resume_timeout");
  pending.resolve();
  await flush();
  assert.equal(context.sources.length, 0);
  context.resume = async () => {};
  assert.equal(await player.play(), true);
  await player.dispose();
});

test("a sample timeout leaves loading, permits retry and clears loading progress", async () => {
  const { player } = setup({
    fetch_sample: () => new Promise(() => {}),
    load_timeout_ms: 10,
  });
  player.load(midi_file());
  assert.equal(await player.play(), false);
  assert.equal(player.status, "error");
  assert.equal(player.snapshot().error.code, "sample_load_timeout");
  assert.equal(player.snapshot().loading_progress, null);
  player.cache.fetch_sample = async () => response();
  assert.equal(await player.play(), true);
  await player.dispose();
});
