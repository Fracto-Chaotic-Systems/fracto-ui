import { Buffer } from "node:buffer";
import test from "node:test";
import assert from "node:assert/strict";
import {
  registry_from_catalog,
  load_instrument_catalog,
  instrument_audio_url,
} from "../src/pages/games/music/MidiInstrumentCatalog.js";
import {
  create_instrument_registry,
  GRANDB_PROVIDER,
  INSTRUMENT_REGISTRY,
} from "../src/pages/games/music/MidiInstruments.js";
import { sample_window } from "../src/pages/games/music/MidiSampleAsset.js";
import { schedule_midi_voice } from "../src/pages/games/music/MidiVoice.js";
import MidiSampleCache from "../src/pages/games/music/MidiSampleCache.js";
import MidiPlaybackController from "../src/pages/games/music/MidiPlaybackController.js";
import { asset_fixture, catalog_url } from "./midi_asset_fixtures.js";
import {
  FakeContext,
  note,
  midi_file,
  response,
  deferred,
  flush,
  fake_timers,
} from "./midi_audio_fakes.js";
const route = "track:0:channel:0";
const registry = (f) => registry_from_catalog(f.catalog, catalog_url);
const options = (registry) => ({
  registry,
  assignments: { [route]: "asset-flute" },
});
function setup(f = asset_fixture(), extra = {}) {
  const context = new FakeContext();
  context.buffer = f.buffer;
  context.sampleRate = 48000;
  const player = new MidiPlaybackController({
    create_context: () => context,
    fetch_sample: async () => f.response(),
    ...fake_timers(context),
    ...extra,
  });
  return { f, context, player };
}

test("catalog URL resolution retains direct, proxy and configured public prefixes", () => {
  assert.equal(
    instrument_audio_url("/instruments/x/audio/y?v=a", catalog_url),
    "https://example.test/api/asset/instruments/x/audio/y?v=a",
  );
  assert.equal(
    instrument_audio_url(
      "/instruments/x/audio/y",
      "http://localhost:3003/instruments",
    ),
    "http://localhost:3003/instruments/x/audio/y",
  );
  assert.equal(
    instrument_audio_url("https://cdn.test/assets/x.wav?v=a", catalog_url),
    "https://cdn.test/assets/x.wav?v=a",
  );
  for (const url of [
    "data:audio/wav,abc",
    "file:///x.wav",
    "https://u:p@host.test/x.wav",
  ])
    assert.throws(() => instrument_audio_url(url, catalog_url), /catalog/);
});

test("disabled catalog sources stay gated; prepared-source opt-in is explicit for verification", () => {
  const f = asset_fixture();
  f.catalog.instruments[0].enabled = false;
  assert.deepEqual(Object.keys(registry(f).providers), ["grandb"]);
  const candidate = registry_from_catalog(f.catalog, catalog_url, {
    allow_prepared: true,
  });
  assert.equal(candidate.can_assign([note()], "asset-flute"), true);
  assert.equal(candidate.can_assign([note(0, 1, 9)], "asset-flute"), false);
  assert.equal(candidate.can_assign([note(0, 1, 0, 62)], "asset-flute"), false);
  assert.equal(candidate.can_assign([note()], "original"), true); // Existing verified piano mapping.
});

test("catalog descriptors share an asset key but preserve distinct pitch windows and sparse coverage", () => {
  const f = asset_fixture();
  f.asset.notes[1].midi_pitch = 62;
  const source = registry(f),
    a = source.resolve(note(), "asset-flute"),
    b = source.resolve(note(0, 1, 0, 62), "asset-flute");
  assert.equal(a.cache_key, b.cache_key);
  assert.equal(a.offset_seconds, 0);
  assert.equal(b.offset_seconds, 1.05);
  assert.equal(source.can_assign([note(0, 1, 0, 61)], "asset-flute"), false);
  assert.equal(a.credentials, "include");
  assert.equal(a.sha256, f.asset.sha256);
  const moved = registry_from_catalog(
    f.catalog,
    "https://other.test/api/asset/instruments",
  );
  assert.notEqual(source.signature, moved.signature);
});

test("malformed catalogs and out-of-bounds/duplicate note mappings are rejected before playback", () => {
  for (const mutate of [
    (f) => f.asset.notes[1].offset_frames++,
    (f) => (f.asset.channels = 2),
    (f) => (f.asset.duration_seconds = NaN),
    (f) => (f.asset.notes[1].midi_pitch = 60),
    (f) => (f.asset.url = "javascript:alert(1)"),
    (f) => (f.asset.sha256 = "0".repeat(64)),
    (f) => f.catalog.instruments.push(f.catalog.instruments[0]),
  ]) {
    const f = asset_fixture();
    mutate(f);
    assert.throws(() => registry(f), /catalog/);
  }
});

test("velocity layers select separate recordings without inventing original MIDI mappings", () => {
  const f = asset_fixture(),
    item = f.catalog.instruments[0],
    original = structuredClone(f.asset);
  item.recordings = ["p", "f"].map((layer) => ({
    id: `flute-${layer}`,
    velocity_layer: layer,
  }));
  item.playback_assets = ["p", "f"].map((layer) => ({
    ...structuredClone(original),
    id: `flute-${layer}-chunk-0`,
    recording_id: `flute-${layer}`,
    velocity_layer: layer,
    url: `/instruments/flute/audio/flute-${layer}-chunk-0?v=${original.sha256}`,
  }));
  const sources = registry(f);
  assert.match(
    sources.resolve({ ...note(), velocity: 1 }, "asset-flute").url,
    /flute-p-chunk/,
  );
  assert.match(
    sources.resolve({ ...note(), velocity: 127 }, "asset-flute").url,
    /flute-f-chunk/,
  );
  assert.equal(
    sources.can_assign([{ ...note(), program: 73 }], "original"),
    false,
  );
});

test("catalog fetch uses credentials, freezes metadata and handles access failures/abort", async () => {
  const f = asset_fixture();
  let seen;
  const loaded = await load_instrument_catalog(catalog_url, {
    fetch_catalog: async (url, init) => {
      seen = { url, init };
      return { ok: true, url, json: async () => f.catalog };
    },
  });
  assert.equal(seen.init.credentials, "include");
  assert.equal(Object.isFrozen(loaded.catalog.instruments[0]), true);
  assert.equal(loaded.registry.can_assign([note()], "asset-flute"), true);
  await assert.rejects(
    load_instrument_catalog(catalog_url, {
      fetch_catalog: async () => ({ ok: false, status: 401 }),
    }),
    /catalog/,
  );
  const abort = new AbortController();
  abort.abort();
  let fetched = false;
  await assert.rejects(
    load_instrument_catalog(catalog_url, {
      signal: abort.signal,
      fetch_catalog: async () => {
        fetched = true;
      },
    }),
    /catalog/,
  );
  assert.equal(fetched, false);
});

test("shared chunks download/decode once, retain credentials, and replay without refetch", async () => {
  const f = asset_fixture(),
    context = new FakeContext();
  context.buffer = f.buffer;
  context.sampleRate = 48000;
  let fetched = 0;
  const cache = new MidiSampleCache({
    fetch_sample: async (url, init) => {
      assert.equal(init.credentials, "include");
      fetched++;
      return f.response();
    },
  });
  const signal = new AbortController().signal,
    notes = [
      { ...note(), track: 0 },
      { ...note(0, 1, 0, 61), track: 0 },
    ];
  const prepared = await cache.prepare(
    notes,
    context,
    signal,
    options(registry(f)),
  );
  assert.equal(fetched, 1);
  assert.equal(context.decoded, 1);
  assert.equal(prepared[0].buffer, prepared[1].buffer);
  assert.equal(prepared[1].offset_seconds, 1.05);
  await cache.prepare(notes, context, signal, options(registry(f)));
  assert.equal(fetched, 1);
});

test("catalog decoded memory preflight rejects oversized songs before downloading", async () => {
  const f = asset_fixture(),
    context = new FakeContext();
  context.sampleRate = 96000;
  context.buffer = f.buffer;
  let fetched = 0;
  const cache = new MidiSampleCache({
    max_bytes: f.buffer.length * 4,
    fetch_sample: async () => {
      fetched++;
      return f.response();
    },
  });
  await assert.rejects(
    cache.prepare(
      [{ ...note(), track: 0 }],
      context,
      new AbortController().signal,
      options(registry(f)),
    ),
    /memory limit/,
  );
  assert.equal(fetched, 0);
  assert.equal(context.decoded, 0);
});

test("checksum and decoded-shape mismatches fail before voices can be created", async () => {
  const f = asset_fixture(),
    context = new FakeContext();
  context.buffer = f.buffer;
  const corrupt = Buffer.from(f.bytes);
  corrupt[70] ^= 1;
  const cache = new MidiSampleCache({
    fetch_sample: async () => ({
      ok: true,
      arrayBuffer: async () =>
        corrupt.buffer.slice(
          corrupt.byteOffset,
          corrupt.byteOffset + corrupt.byteLength,
        ),
    }),
  });
  await assert.rejects(
    cache.prepare(
      [{ ...note(), track: 0 }],
      context,
      new AbortController().signal,
      options(registry(f)),
    ),
    /checksum/,
  );
  assert.equal(context.decoded, 0);
  const shape = new MidiSampleCache({ fetch_sample: async () => f.response() });
  context.buffer = { ...f.buffer, duration: 3 };
  await assert.rejects(
    shape.prepare(
      [{ ...note(), track: 0 }],
      context,
      new AbortController().signal,
      options(registry(f)),
    ),
    /differs/,
  );
  assert.equal(context.sources.length, 0);
});

test("bounded voices combine pitch offset with lateness and cannot run into the next note", () => {
  const context = new FakeContext(),
    f = asset_fixture();
  const sample = {
    ...registry(f).resolve(note(0, 4, 0, 61), "asset-flute"),
    buffer: f.buffer,
  };
  context.currentTime = 0.25;
  schedule_midi_voice(context, {}, note(0, 4, 0, 61), sample, 0, () => {});
  assert.deepEqual(context.sources[0].started, [0.25, 1.3]);
  assert.ok(Math.abs(context.sources[0].stop_at - 1) < 1e-9);
  context.currentTime = 1.01;
  assert.equal(
    schedule_midi_voice(context, {}, note(0, 4, 0, 61), sample, 0, () => {}),
    null,
  );
  assert.equal(context.sources.length, 1);
  assert.throws(
    () =>
      sample_window({
        ...sample,
        offset_seconds: 2.05,
        duration_seconds: 0.000001,
      }),
    /window/,
  );
});

test("different pitches in a shared chunk retain independent polyphonic voices and release times", () => {
  const context = new FakeContext(),
    f = asset_fixture(),
    sources = registry(f);
  for (const pitch of [60, 61, 60])
    schedule_midi_voice(
      context,
      {},
      note(0, 0.5, 0, pitch),
      {
        ...sources.resolve(note(0, 0.5, 0, pitch), "asset-flute"),
        buffer: f.buffer,
      },
      0,
      () => {},
    );
  assert.equal(context.sources.length, 3);
  assert.equal(new Set(context.sources).size, 3);
  assert.deepEqual(
    context.sources.map((source) => source.started[1]),
    [0, 1.05, 0],
  );
  assert.deepEqual(
    context.sources.map((source) => source.stop_at),
    [0.65, 0.65, 0.65],
  );
});

test("a failed preparation cancels sibling workers so late results cannot repopulate the cache", async () => {
  const pending = deferred();
  let calls = 0;
  const sources = create_instrument_registry([
    {
      ...GRANDB_PROVIDER,
      sample: (n) => ({
        url: `https://example.test/${n.pitch}`,
        gain: 0.4,
        pan: 0,
        release_seconds: 0.1,
      }),
    },
  ]);
  const cache = new MidiSampleCache({
    fetch_sample: async () =>
      ++calls === 1 ? { ok: false, status: 403 } : pending.promise,
  });
  await assert.rejects(
    cache.prepare(
      [note(), note(0, 1, 0, 61)],
      new FakeContext(),
      new AbortController().signal,
      { registry: sources },
    ),
    /download or decode/,
  );
  pending.resolve(response());
  await flush();
  assert.equal(cache.buffers.size, 0);
});

test("catalog refresh is silent, preserves mix, and stops active playback when sources change", async () => {
  const f = asset_fixture(),
    state = [];
  const { player, context } = setup(f, {
    catalog_loader: async () => ({ catalog: f.catalog, registry: registry(f) }),
    on_catalog: (s) => state.push(s),
  });
  player.load(midi_file());
  player.set_mix(route, { volume: 0.4 });
  assert.equal(await player.refresh_catalog(), true);
  assert.equal(context.resume_count, 0);
  assert.equal(player.set_instrument(route, "asset-flute"), true);
  assert.equal(await player.play(), true);
  f.catalog.revision = "b".repeat(64);
  assert.equal(await player.refresh_catalog(), true);
  assert.equal(context.sources[0].stopped, true);
  assert.equal(player.status, "stopped");
  assert.equal(player.mixer.mix[route].volume, 0.4);
  assert.equal(player.instruments.assignments[route], "asset-flute");
  assert.equal(await player.play(), true);
  assert.equal(player.status, "playing");
  assert.equal(state.at(-1).status, "ready");
  await player.dispose();
  assert.equal(context.close_count, 1);
  assert.equal(player.cache.bytes, 0);
});

test("Stop/dispose cancel pending catalog refresh and suppress late registry/callback changes", async () => {
  for (const dispose of [false, true]) {
    const f = asset_fixture(),
      pending = deferred(),
      states = [];
    const { player, context } = setup(f, {
      catalog_loader: async () => pending.promise,
      on_catalog: (s) => states.push(s),
    });
    const refresh = player.refresh_catalog();
    assert.equal(context.resume_count, 0);
    if (dispose) await player.dispose();
    else player.stop();
    const count = states.length;
    pending.resolve({ catalog: f.catalog, registry: registry(f) });
    assert.equal(await refresh, false);
    assert.equal(states.length, count);
    assert.equal(player.instruments.registry, INSTRUMENT_REGISTRY);
    if (!dispose) {
      assert.equal(player.catalog_state.status, "idle");
      await player.dispose();
    }
  }
});

test("catalog access failure retains the existing piano provider and does not initialize audio", async () => {
  const { player, context } = setup(undefined, {
    catalog_loader: async () => {
      throw new Error("HTTP 401");
    },
  });
  assert.equal(await player.refresh_catalog(), false);
  assert.equal(player.catalog_state.error, "catalog_unavailable");
  assert.equal(player.instruments.registry, INSTRUMENT_REGISTRY);
  assert.equal(context.resume_count, 0);
  await player.dispose();
});

test("long-note warnings use the pitch window rather than the enclosing chunk duration", async () => {
  const f = asset_fixture(),
    { player } = setup(f, { instrument_registry: registry(f) });
  const file = midi_file();
  file[26] = 0x8f;
  file[27] = 0;
  player.load(file);
  player.set_instrument(route, "asset-flute");
  await player.play();
  assert.ok(
    player.warnings.some(
      (warning) =>
        warning.code === "sample_shorter_than_note" && warning.count === 1,
    ),
  );
  await player.dispose();
});

test("Stop cancels chunk byte reads and decoding without accepting late cache results", async () => {
  for (const stage of ["body", "decode"]) {
    const f = asset_fixture(),
      started = deferred(),
      pending = deferred();
    const { player, context } = setup(f, {
      instrument_registry: registry(f),
      fetch_sample: async () =>
        stage === "body"
          ? {
              ok: true,
              arrayBuffer: async () => {
                started.resolve();
                return pending.promise;
              },
            }
          : f.response(),
    });
    if (stage === "decode")
      context.decodeAudioData = async () => {
        started.resolve();
        return pending.promise;
      };
    player.load(midi_file());
    player.set_instrument(route, "asset-flute");
    const play = player.play();
    await started.promise;
    player.stop();
    pending.resolve(
      stage === "body"
        ? f.bytes.buffer.slice(
            f.bytes.byteOffset,
            f.bytes.byteOffset + f.bytes.byteLength,
          )
        : f.buffer,
    );
    assert.equal(await play, false);
    assert.equal(context.sources.length, 0);
    assert.equal(player.cache.bytes, 0);
    await player.dispose();
  }
});

test("file replacement does not discard independent catalog discovery or initialize audio", async () => {
  const f = asset_fixture(),
    pending = deferred();
  const { player, context } = setup(f, {
    catalog_loader: async () => pending.promise,
  });
  const refresh = player.refresh_catalog();
  const song = player.load(midi_file());
  pending.resolve({ catalog: f.catalog, registry: registry(f) });
  assert.equal(await refresh, true);
  assert.equal(player.song, song);
  assert.equal(player.set_instrument(route, "asset-flute"), true);
  assert.equal(context.resume_count, 0);
  await player.dispose();
});

test("metadata-only catalog refresh does not interrupt the existing piano graph", async () => {
  const f = asset_fixture();
  f.catalog.instruments[0].enabled = false;
  const { player, context } = setup(f, {
    catalog_loader: async () => ({ catalog: f.catalog, registry: registry(f) }),
  });
  player.load(midi_file());
  await player.play();
  const scheduler = player.scheduler;
  assert.equal(await player.refresh_catalog(), true);
  assert.equal(player.scheduler, scheduler);
  assert.equal(player.status, "playing");
  assert.notEqual(context.sources[0].stopped, true);
  assert.equal(context.decoded, 1);
  await player.dispose();
});

test("disposal in a catalog-loading callback prevents the fetch from starting", async () => {
  let called = false,
    player;
  player = new MidiPlaybackController({
    catalog_loader: async () => {
      called = true;
    },
    on_catalog: (state) => {
      if (state.status === "loading") void player.dispose();
    },
  });
  assert.equal(await player.refresh_catalog(), false);
  assert.equal(called, false);
});

test("discovery of unrelated providers does not stop the active legacy piano", async () => {
  const f = asset_fixture();
  const { player, context } = setup(f, {
    catalog_loader: async () => ({ catalog: f.catalog, registry: registry(f) }),
  });
  player.load(midi_file());
  player.set_mix(route, { volume: 0.4 });
  assert.equal(await player.play(), true);
  const scheduler = player.scheduler,
    bytes = player.cache.bytes;
  assert.equal(await player.refresh_catalog(), true);
  assert.equal(player.scheduler, scheduler);
  assert.equal(player.status, "playing");
  assert.equal(player.cache.bytes, bytes);
  assert.equal(player.mixer.mix[route].volume, 0.4);
  assert.ok(player.instruments.registry.providers["asset-flute"]);
  assert.ok(context.sources.every((source) => !source.stopped));
  await player.dispose();
});

test("discovery during unchanged-source preparation does not cancel the first Play", async () => {
  const f = asset_fixture(),
    pending = deferred();
  const { player } = setup(f, {
    fetch_sample: () => pending.promise,
    catalog_loader: async () => ({ catalog: f.catalog, registry: registry(f) }),
  });
  player.load(midi_file());
  const playing = player.play();
  await flush();
  assert.equal(player.status, "loading");
  assert.equal(await player.refresh_catalog(), true);
  assert.equal(player.status, "loading");
  pending.resolve(f.response());
  assert.equal(await playing, true);
  assert.equal(player.status, "playing");
  await player.dispose();
});
