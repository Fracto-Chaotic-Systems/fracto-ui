import test from "node:test";
import assert from "node:assert/strict";
import MidiMixer, {
  DEFAULT_MIDI_MIX,
  midi_route_id,
  midi_mix_gain,
} from "../src/pages/games/music/MidiMixer.js";
import MidiPlaybackController from "../src/pages/games/music/MidiPlaybackController.js";
import {
  FakeContext,
  fake_timers,
  response,
  midi_file,
  deferred,
  flush,
} from "./midi_audio_fakes.js";
const a = { track: 0, channel: 0 },
  b = { track: 1, channel: 0 },
  c = { track: 1, channel: 2 };
const key = midi_route_id;
const final = (parameter) => parameter.events.at(-1);

test("routes distinguish tracks sharing a channel and channels sharing a track", () => {
  const mixer = new MidiMixer();
  mixer.load({ notes: [a, b, c, a] });
  assert.deepEqual(Object.keys(mixer.mix), [key(a), key(b), key(c)]);
  const original = mixer.mix;
  mixer.update(key(a), { mute: true, pan: -9, volume: 3 });
  assert.deepEqual(mixer.mix[key(a)], {
    mute: true,
    solo: false,
    volume: 1,
    pan: -1,
  });
  assert.equal(mixer.mix[key(b)], DEFAULT_MIDI_MIX);
  assert.equal(original[key(a)].mute, false);
  assert.ok(Object.isFrozen(mixer.mix) && Object.isFrozen(mixer.mix[key(a)]));
  assert.equal(mixer.update("__proto__", { mute: true }), false);
  mixer.update(key(a), { volume: NaN, pan: Infinity, solo: "yes" });
  assert.equal(mixer.mix[key(a)].solo, false);
  assert.equal(mixer.mix[key(a)].volume, 1);
});

test("mute wins over solo and multiple solos remain independent", () => {
  const mixer = new MidiMixer();
  mixer.load({ notes: [a, b, c] });
  const context = new FakeContext();
  mixer.connect(context, {});
  mixer.update(key(a), { solo: true, volume: 0.4 });
  assert.equal(final(mixer.buses.get(key(a)).gain.gain)[1], 0.4);
  assert.equal(final(mixer.buses.get(key(b)).gain.gain)[1], 0);
  mixer.update(key(a), { mute: true });
  assert.equal(midi_mix_gain(mixer.mix[key(a)], true), 0);
  mixer.update(key(b), { solo: true });
  assert.equal(final(mixer.buses.get(key(b)).gain.gain)[1], 1);
  assert.equal(final(mixer.buses.get(key(c)).gain.gain)[1], 0);
  mixer.reset();
  assert.equal(
    Object.values(mixer.mix).some((s) => s.solo || s.mute),
    false,
  );
  assert.ok(
    [...mixer.buses.values()].every((bus) => final(bus.gain.gain)[1] === 1),
  );
});

test("live automation ramps gains and pan at context time and releases every bus", () => {
  const mixer = new MidiMixer();
  mixer.load({ notes: [a, b] });
  const context = new FakeContext();
  context.currentTime = 40;
  mixer.connect(context, {});
  assert.equal(mixer.destination(a), mixer.buses.get(key(a)).gain);
  assert.notEqual(mixer.destination(a), mixer.destination(b));
  const buses = [...mixer.buses.values()];
  mixer.update(key(a), { pan: 1, volume: 0 });
  assert.deepEqual(final(buses[0].gain.gain), ["ramp", 0, 40.012]);
  assert.deepEqual(final(buses[0].pan.pan), ["ramp", 1, 40.012]);
  mixer.disconnect();
  assert.equal(mixer.buses.size, 0);
  assert.ok(
    buses.every((bus) => bus.gain.disconnected && bus.pan.disconnected),
  );
  assert.equal(mixer.mix[key(a)].pan, 1);
});

test("bus allocation failures disconnect partial routes", () => {
  const mixer = new MidiMixer();
  mixer.load({ notes: [a, b] });
  const context = new FakeContext();
  const create = context.createStereoPanner.bind(context);
  let count = 0;
  context.createStereoPanner = () => {
    if (++count === 2) throw new Error("failed");
    return create();
  };
  assert.throws(() => mixer.connect(context, {}), /failed/);
  assert.equal(mixer.buses.size, 0);
  assert.ok(context.gains.every((g) => g.disconnected));
  assert.ok(context.pans.every((p) => p.disconnected));
});

test("controller routes active and scheduled voices through persistent settings and cleans Stop/replay", async () => {
  const context = new FakeContext(),
    timers = fake_timers(context),
    mixes = [];
  const player = new MidiPlaybackController({
    create_context: () => context,
    fetch_sample: async () => response(),
    on_mix: (mix) => mixes.push(mix),
    ...timers,
  });
  player.load(midi_file());
  const id = Object.keys(player.mixer.mix)[0];
  player.set_mix(id, { mute: true, volume: 0.5, pan: 0.3 });
  await player.play();
  const bus = player.mixer.buses.get(id);
  const voice_pan = context.pans.at(-1);
  assert.equal(voice_pan.connections[0], bus.gain);
  assert.equal(bus.gain.connections[0], bus.pan);
  assert.equal(bus.pan.connections[0], player.master);
  assert.equal(bus.gain.gain.value, 0);
  player.set_mix(id, { mute: false });
  assert.equal(final(bus.gain.gain)[1], 0.5);
  player.stop();
  assert.equal(bus.gain.disconnected, true);
  assert.equal(bus.pan.disconnected, true);
  assert.equal(player.mixer.mix[id].volume, 0.5);
  await player.play();
  assert.notEqual(player.mixer.buses.get(id), bus);
  assert.equal(context.decoded, 1);
  player.reset_mix();
  assert.deepEqual(player.mixer.mix[id], DEFAULT_MIDI_MIX);
  player.set_mix(id, { solo: true, pan: -1 });
  player.load(midi_file());
  assert.deepEqual(player.mixer.mix[id], DEFAULT_MIDI_MIX);
  assert.equal(player.mixer.buses.size, 0);
  assert.throws(() => player.load(new Uint8Array()), /Truncated/);
  assert.equal(Object.keys(player.mixer.mix).length, 0);
  await player.dispose();
  assert.equal(player.set_mix(id, { mute: true }), false);
  const callbacks = mixes.length;
  player.reset_mix();
  assert.equal(mixes.length, callbacks);
});

test("latest mix edits during preparation apply before the first voice, while Stop prevents stale routes", async () => {
  const context = new FakeContext(),
    fetch = deferred();
  const player = new MidiPlaybackController({
    create_context: () => context,
    fetch_sample: async () => fetch.promise,
    ...fake_timers(context),
  });
  player.load(midi_file());
  const id = Object.keys(player.mixer.mix)[0];
  const pending = player.play();
  await flush();
  player.set_mix(id, { mute: true, solo: true, pan: -1 });
  fetch.resolve(response());
  await pending;
  assert.equal(player.mixer.buses.get(id).gain.gain.value, 0);
  assert.equal(player.mixer.buses.get(id).pan.pan.value, -1);
  player.stop();
  assert.equal(player.mixer.buses.size, 0);
  player.unload();
  assert.deepEqual(player.mixer.mix, {});
  await player.dispose();
});

test("muting unsupported routes does not silently bypass piano limitations", async () => {
  const player = new MidiPlaybackController({
    create_context: () => new FakeContext(),
    fetch_sample: async () => response(),
  });
  const file = midi_file();
  file[24] = 12;
  player.load(file);
  player.set_mix(Object.keys(player.mixer.mix)[0], { mute: true });
  assert.equal(await player.play(), false);
  assert.equal(player.error.code, "unsupported_pitch");
  assert.equal(player.mixer.buses.size, 0);
  await player.dispose();
});
