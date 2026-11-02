import test from "node:test";
import assert from "node:assert/strict";
import {
  GRANDB_PROVIDER,
  INSTRUMENT_REGISTRY,
  create_instrument_registry,
} from "../src/pages/games/music/MidiInstruments.js";
import MidiInstrumentAssignments from "../src/pages/games/music/MidiInstrumentAssignments.js";
import MidiPlaybackController from "../src/pages/games/music/MidiPlaybackController.js";
import MidiSampleCache from "../src/pages/games/music/MidiSampleCache.js";
import { piano_sample } from "../src/pages/games/music/MidiPianoSamples.js";
import { midi_route_id } from "../src/pages/games/music/MidiMixer.js";
import { events_from_midi } from "../src/pages/games/music/MidiEvents.js";
import {
  FakeContext,
  fake_timers,
  midi_file,
  note,
  response,
  deferred,
  flush,
} from "./midi_audio_fakes.js";
const n = (track = 0, program = 0, extra = {}) => ({
  ...note(),
  track,
  program,
  bank_msb: 0,
  bank_lsb: 0,
  ...extra,
});
const other = {
  ...GRANDB_PROVIDER,
  id: "test-provider",
  version: "1",
  programs: [73],
  label_key: "test_only",
  sample: (note) => piano_sample(note),
};
const registry = create_instrument_registry([GRANDB_PROVIDER, other]);

test("only verified providers are selectable and unsupported original programs/banks are explicit", () => {
  const catalog = create_instrument_registry([
    GRANDB_PROVIDER,
    { ...other, verified: false },
  ]);
  assert.deepEqual(Object.keys(catalog.providers), ["grandb"]);
  assert.equal(catalog.can_assign([n()], "original"), true);
  for (const sample of [
    n(0, 73),
    n(0, 0, { bank_msb: 1 }),
    n(0, 0, { bank_lsb: 1 }),
    n(0, 0, { channel: 9 }),
    n(0, 0, { pitch: 12 }),
  ])
    assert.equal(catalog.can_assign([sample], "original"), false);
  assert.throws(
    () => catalog.resolve(n(0, 73), "original"),
    /verified sound source/,
  );
  assert.equal(catalog.can_assign([n()], "__proto__"), false);
  assert.throws(() => catalog.resolve(n(), "__proto__"), /verified/);
});

test("original assignment resolves every note's program history without modifying it", () => {
  const notes = Object.freeze([Object.freeze(n()), Object.freeze(n(0, 73))]);
  assert.equal(registry.can_assign(notes, "original"), true);
  assert.deepEqual(
    notes.map((note) => registry.resolve(note, "original").instrument_id),
    ["grandb", "test-provider"],
  );
  assert.equal(INSTRUMENT_REGISTRY.can_assign(notes, "original"), false);
  assert.deepEqual(
    notes.map((note) => note.program),
    [0, 73],
  );
  assert.equal(registry.resolve(notes[1], "grandb").instrument_id, "grandb");
});

test("instrument IDs and versions isolate sample caches even when URLs coincide", async () => {
  let fetched = 0;
  const context = new FakeContext();
  const cache = new MidiSampleCache({
    fetch_sample: async () => {
      fetched++;
      return response();
    },
  });
  const notes = [n(), n(1, 73)],
    signal = new AbortController().signal;
  const assignments = {
    [midi_route_id(notes[0])]: "grandb",
    [midi_route_id(notes[1])]: "test-provider",
  };
  const samples = await cache.prepare(notes, context, signal, {
    registry,
    assignments,
  });
  assert.equal(samples[0].url, samples[1].url);
  assert.notEqual(samples[0].cache_key, samples[1].cache_key);
  assert.equal(fetched, 2);
  assert.equal(cache.buffers.size, 2);
  await cache.prepare(notes, context, signal, { registry, assignments });
  assert.equal(fetched, 2);
  const updated = create_instrument_registry([
    GRANDB_PROVIDER,
    { ...other, version: "2" },
  ]);
  await cache.prepare(notes, context, signal, {
    registry: updated,
    assignments,
  });
  assert.equal(fetched, 3);
  assert.ok(
    [...cache.buffers.keys()].some((key) => key.startsWith("test-provider@2:")),
  );
});

test("assignment state is immutable and file-scoped without track/channel leakage", () => {
  const assignments = new MidiInstrumentAssignments(registry);
  const a = n(),
    b = n(1, 73),
    key = midi_route_id(a);
  assignments.load({ notes: [a, b] });
  const previous = assignments.assignments;
  assert.equal(assignments.can_set(key, "original"), true);
  assignments.set(key, "original");
  assert.equal(previous[key], "grandb");
  assert.equal(assignments.assignments[midi_route_id(b)], "grandb");
  assert.ok(Object.isFrozen(assignments.assignments));
  assignments.load({ notes: [a, b] });
  assert.equal(assignments.assignments[key], "grandb");
  assignments.load(null);
  assert.deepEqual(assignments.assignments, {});
});

test("changing during pending fetch cancels stale work, preserves mix and requires another Play", async () => {
  const context = new FakeContext(),
    first = deferred();
  let calls = 0;
  const player = new MidiPlaybackController({
    create_context: () => context,
    fetch_sample: async () => (++calls === 1 ? first.promise : response()),
    ...fake_timers(context),
  });
  player.load(midi_file());
  const key = Object.keys(player.instruments.assignments)[0];
  player.set_mix(key, { volume: 0.4 });
  const stale = player.play();
  await flush();
  assert.equal(player.set_instrument(key, "original"), true);
  assert.equal(player.status, "stopped");
  assert.equal(context.sources.length, 0);
  const replay = player.play();
  first.resolve(response());
  assert.equal(await stale, false);
  assert.equal(await replay, true);
  assert.equal(context.sources.length, 1);
  assert.equal(context.decoded, 1);
  assert.equal(player.instruments.assignments[key], "original");
  assert.equal(player.mixer.mix[key].volume, 0.4);
  const generation = player.generation;
  player.set_instrument(key, "original");
  assert.equal(player.generation, generation);
  player.set_instrument(key, "grandb");
  assert.equal(player.status, "stopped");
  assert.equal(context.sources[0].disconnected, true);
  assert.equal(player.mixer.buses.size, 0);
  await player.dispose();
});

test("changing during decode cannot resurrect an obsolete instrument or cache entry", async () => {
  const context = new FakeContext(),
    decode = deferred();
  context.decodeAudioData = () => decode.promise;
  const player = new MidiPlaybackController({
    create_context: () => context,
    fetch_sample: async () => response(),
    ...fake_timers(context),
  });
  player.load(midi_file());
  const key = Object.keys(player.instruments.assignments)[0];
  const pending = player.play();
  await flush();
  player.set_instrument(key, "original");
  decode.resolve(context.buffer);
  assert.equal(await pending, false);
  assert.equal(context.sources.length, 0);
  assert.equal(player.cache.buffers.size, 0);
  assert.equal(player.status, "stopped");
  await player.dispose();
});

test("replacement/reset and disposal remove overrides without late callbacks", async () => {
  const callbacks = [],
    player = new MidiPlaybackController({
      on_instruments: (settings) => callbacks.push(settings),
    });
  player.load(midi_file());
  const key = Object.keys(player.instruments.assignments)[0];
  player.set_instrument(key, "original");
  player.load(midi_file());
  assert.equal(player.instruments.assignments[key], "grandb");
  const generation = player.generation;
  assert.equal(player.set_instrument(key, "not-verified"), false);
  assert.equal(player.generation, generation);
  assert.throws(() => player.load(new Uint8Array()));
  assert.deepEqual(player.instruments.assignments, {});
  player.load(midi_file());
  player.unload();
  assert.deepEqual(player.instruments.assignments, {});
  await player.dispose();
  const count = callbacks.length;
  assert.equal(player.set_instrument(key, "original"), false);
  assert.equal(callbacks.length, count);
});

test("bank-select provenance is preserved and never relabeled as standard-bank original piano", () => {
  const original = midi_file(),
    prefix = [0, 0xb0, 0, 2, 0, 0xb0, 32, 4, 0, 0xc0, 0];
  const bytes = new Uint8Array([
    ...original.slice(0, 22),
    ...prefix,
    ...original.slice(22),
  ]);
  bytes[21] = prefix.length + original.length - 22;
  const song = events_from_midi(bytes);
  assert.equal(song.notes[0].bank_msb, 2);
  assert.equal(song.notes[0].bank_lsb, 4);
  assert.equal(song.program_changes[0].bank_msb, 2);
  assert.equal(song.program_changes[0].bank_lsb, 4);
  assert.equal(INSTRUMENT_REGISTRY.can_assign(song.notes, "original"), false);
  assert.equal(INSTRUMENT_REGISTRY.can_assign(song.notes, "grandb"), true);
});

const multi = create_instrument_registry(
  [
    GRANDB_PROVIDER,
    other,
    { ...GRANDB_PROVIDER, id: "fluid-piano", library_id: "fluidr3-gm" },
    {
      ...other,
      id: "fluid-flute",
      library_id: "fluidr3-gm",
      supports_note: (note) => note.pitch !== 61,
    },
  ],
  {
    libraries: [
      { id: "legacy", status: "active" },
      { id: "fluidr3-gm", status: "active" },
      { id: "audited", status: "audited" },
    ],
  },
);

test("library selection scopes GM history, retains overrides and rejects missing keys/banks", () => {
  const notes = [n(0, 0), n(0, 73), n(1, 73)];
  const model = new MidiInstrumentAssignments(multi);
  model.load({ notes });
  const [automatic, manual] = [...model.routes.keys()];
  model.set(manual, "test-provider");
  assert.equal(model.select_library("audited"), false);
  assert.equal(model.select_library("fluidr3-gm"), true);
  assert.equal(model.assignments[automatic], "original");
  assert.equal(model.assignments[manual], "test-provider");
  assert.deepEqual(
    notes
      .slice(0, 2)
      .map((note) => model.registry.resolve(note, "original").instrument_id),
    ["fluid-piano", "fluid-flute"],
  );
  assert.equal(
    model.registry.can_assign([n(0, 73, { pitch: 61 })], "original"),
    false,
  );
  assert.equal(
    model.registry.can_assign([n(0, 73, { bank_lsb: 1 })], "original"),
    false,
  );
  model.replace_registry(multi);
  assert.equal(model.registry.default_library_id, "fluidr3-gm");
  model.select_library("legacy");
  assert.equal(model.assignments[automatic], "original");
  assert.equal(model.assignments[manual], "test-provider");
  model.select_library("fluidr3-gm");
  model.load({ notes });
  assert.ok(Object.values(model.assignments).every((id) => id === "original"));
  model.replace_registry(INSTRUMENT_REGISTRY);
  assert.equal(model.registry.default_library_id, "legacy");
  assert.ok(Object.values(model.assignments).every((id) => id === "grandb"));
});

test("switching libraries stops native scheduling, preserves mix and cancels stale preparation", async () => {
  const context = new FakeContext(),
    pending = deferred();
  let calls = 0;
  const player = new MidiPlaybackController({
    instrument_registry: multi,
    create_context: () => context,
    fetch_sample: async () => (++calls === 1 ? pending.promise : response()),
    ...fake_timers(context),
  });
  player.load(midi_file());
  const route = Object.keys(player.instruments.assignments)[0];
  player.set_mix(route, { volume: 0.4, pan: 0.2, solo: true });
  const mix = player.mixer.mix;
  const loading = player.play();
  await flush();
  assert.equal(player.set_library("fluidr3-gm"), true);
  pending.resolve(response());
  assert.equal(await loading, false);
  assert.equal(context.sources.length, 0);
  assert.equal(player.cache.buffers.size, 0);
  assert.equal(player.mixer.mix, mix);
  assert.equal(player.instruments.assignments[route], "original");
  assert.equal(await player.play(), true);
  player.set_library("legacy");
  assert.equal(player.status, "stopped");
  assert.equal(player.scheduler, null);
  assert.equal(player.mixer.mix, mix);
  player.load(midi_file());
  assert.equal(player.instruments.assignments[route], "original");
  await player.dispose();
});

test("catalog refresh preserves selected library and original unsupported assignments", async () => {
  let next = multi;
  const player = new MidiPlaybackController({
    instrument_registry: multi,
    catalog_loader: async () => ({ registry: next, catalog: {} }),
  });
  player.load(midi_file());
  player.set_library("fluidr3-gm");
  const route = Object.keys(player.instruments.assignments)[0];
  player.set_instrument(route, "original");
  await player.refresh_catalog();
  assert.equal(player.catalog_state.registry.default_library_id, "fluidr3-gm");
  next = create_instrument_registry(
    [
      GRANDB_PROVIDER,
      { ...other, id: "fluid-flute", library_id: "fluidr3-gm" },
    ],
    { libraries: multi.libraries },
  );
  await player.refresh_catalog();
  assert.equal(player.instruments.assignments[route], "original");
  assert.equal(
    player.instruments.registry.can_assign(player.song.notes, "original"),
    false,
  );
  await player.dispose();
});
