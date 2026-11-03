import { prepared_kit } from "./midi_drum_assets_fixture.js";
import MidiPlaybackController from "../src/pages/games/music/MidiPlaybackController.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
  catalog_libraries,
  MAX_CATALOG_BYTES,
} from "../src/pages/games/music/MidiCatalogLibraries.js";
import {
  registry_from_catalog,
  load_instrument_catalog,
} from "../src/pages/games/music/MidiInstrumentCatalog.js";
import {
  create_instrument_registry,
  GRANDB_PROVIDER,
} from "../src/pages/games/music/MidiInstruments.js";
import { asset_fixture, catalog_url } from "./midi_asset_fixtures.js";
import { note } from "./midi_audio_fakes.js";
const libraries = [
  {
    id: "legacy",
    name: "Legacy recordings",
    version: "1",
    source_format: "chromatic-mp3",
    status: "active",
  },
  {
    id: "fluidr3-gm",
    name: "FluidR3 GM",
    version: "pinned",
    source_format: "midi-js-note-mp3",
    status: "active",
  },
];
function multiple() {
  const { catalog } = asset_fixture();
  catalog.libraries = structuredClone(libraries);
  catalog.default_library_id = "legacy";
  catalog.instruments[0].library_id = "legacy";
  catalog.instruments[0].instrument_key = "flute";
  const other = structuredClone(catalog.instruments[0]);
  other.id = "fluidr3-gm-flute";
  other.library_id = "fluidr3-gm";
  for (const asset of other.playback_assets)
    asset.url = asset.url.replace("/flute/", "/fluidr3-gm-flute/");
  other.midi_programs = [73];
  catalog.instruments.push(other);
  return catalog;
}
test("old catalogs normalize and multi-library provider identities remain distinct", () => {
  const old = asset_fixture().catalog;
  assert.equal(catalog_libraries(old).libraries[0].id, "legacy");
  assert.equal(catalog_libraries(old).default_library_id, "legacy");
  assert.deepEqual(catalog_libraries(multiple()).libraries, libraries);
  const registry = registry_from_catalog(multiple(), catalog_url);
  assert.equal(registry.providers["asset-flute"].library_id, "legacy");
  assert.equal(
    registry.providers["asset-fluidr3-gm-flute"].instrument_key,
    "flute",
  );
  assert.notEqual(
    registry.resolve(note(), "asset-flute").cache_key,
    registry.resolve(note(), "asset-fluidr3-gm-flute").cache_key,
  );
});
test("unknown libraries, namespace collisions, duplicate keys, invalid metadata and audited playback fail consistently", () => {
  const mutations = [
    (c) => c.libraries.push({ ...libraries[0] }),
    (c) => (c.default_library_id = "missing"),
    (c) => (c.instruments[0].library_id = "missing"),
    (c) => (c.instruments[1].id = "flute"),
    (c) => c.instruments.push({ ...c.instruments[0], id: "other" }),
    (c) => (c.libraries[1].status = "audited"),
    (c) => (c.libraries[1].license = { path: "private" }),
    (c) => (c.libraries[1].source_url = "file:///private/library"),
    (c) => (c.libraries[1].source_revision = "moving-branch"),
    (c) => {
      c.libraries[1].status = "audited";
      c.default_library_id = "fluidr3-gm";
      c.instruments[1].enabled = false;
    },
  ];
  for (const mutate of mutations) {
    const c = multiple();
    mutate(c);
    assert.throws(() => catalog_libraries(c));
    assert.throws(() => registry_from_catalog(c, catalog_url), {
      code: "catalog_unavailable",
    });
  }
});
test("catalogs above 128 entries work while the 2048 bound remains enforced", () => {
  const c = multiple();
  c.instruments = [];
  for (let i = 0; i < 149; i++)
    c.instruments.push({
      id: `fluidr3-gm-sound-${i}`,
      library_id: "fluidr3-gm",
      instrument_key: `sound-${i}`,
      name: `Sound ${i}`,
      enabled: false,
    });
  assert.equal(
    Object.keys(registry_from_catalog(c, catalog_url).providers).length,
    1,
  );
  assert.equal(catalog_libraries(c).libraries.length, 2);
  c.instruments = Array(2049).fill(c.instruments[0]);
  assert.throws(() => catalog_libraries(c));
  assert.throws(() => registry_from_catalog(c, catalog_url));
});
test("original programs are scoped to a library with no accidental legacy piano fallback", () => {
  const alternate = {
    ...GRANDB_PROVIDER,
    id: "asset-fluidr3-gm-piano",
    library_id: "fluidr3-gm",
    instrument_key: "piano",
    programs: [0],
  };
  const r = create_instrument_registry([GRANDB_PROVIDER, alternate], {
    default_library_id: "fluidr3-gm",
    libraries,
  });
  assert.equal(r.resolve(note(), "original").instrument_id, alternate.id);
  assert.equal(
    r.resolve(note(), "original", { library_id: "legacy" }).instrument_id,
    "grandb",
  );
  assert.equal(r.can_assign([note()], "original", "missing"), false);
  assert.equal(
    create_instrument_registry([GRANDB_PROVIDER], {
      default_library_id: "fluidr3-gm",
      libraries,
    }).can_assign([note()], "original"),
    false,
  );
  assert.equal(r.can_assign([{ ...note(), bank_msb: 1 }], "original"), false);
});
test("streamed catalog decoding preserves UTF8 and enforces declared and streamed byte limits", async () => {
  const c = multiple();
  c.libraries[1].name = "Flûte library";
  const bytes = new TextEncoder().encode(JSON.stringify(c));
  let offset = 0;
  const response = new Response(
    new ReadableStream({
      pull(controller) {
        if (offset === bytes.length) controller.close();
        else controller.enqueue(bytes.slice(offset, ++offset));
      },
    }),
  );
  const loaded = await load_instrument_catalog(catalog_url, {
    fetch_catalog: async () => response,
  });
  assert.equal(loaded.registry.libraries[1].name, "Flûte library");
  await assert.rejects(
    load_instrument_catalog(catalog_url, {
      fetch_catalog: async () =>
        new Response("{}", {
          headers: { "content-length": String(MAX_CATALOG_BYTES + 1) },
        }),
    }),
    { code: "catalog_unavailable" },
  );
  let cancelled = false,
    sent = 0;
  const chunk = new Uint8Array(1024 * 1024);
  const large = new Response(
    new ReadableStream({
      pull(controller) {
        controller.enqueue(chunk);
        sent++;
      },
      cancel() {
        cancelled = true;
      },
    }),
  );
  await assert.rejects(
    load_instrument_catalog(catalog_url, { fetch_catalog: async () => large }),
    { code: "catalog_unavailable" },
  );
  assert.ok(cancelled);
  assert.ok(sent <= 34);
});

test("library metadata refresh publishes the new registry without a source identity change", async () => {
  const make = (name) =>
    create_instrument_registry([GRANDB_PROVIDER], {
      libraries: [{ ...libraries[0], name }],
      default_library_id: "legacy",
    });
  let next = make("First title");
  const player = new MidiPlaybackController({
    catalog_loader: async () => ({ catalog: {}, registry: next }),
  });
  assert.equal(await player.refresh_catalog(), true);
  const signature = player.instruments.registry.signature;
  next = make("Updated title");
  assert.equal(next.signature, signature);
  assert.equal(await player.refresh_catalog(), true);
  assert.equal(
    player.catalog_state.registry.libraries[0].name,
    "Updated title",
  );
  await player.dispose();
});

test("FluidR3 default assigns original programs on first load and replacement, retaining explicit Legacy choice", async () => {
  const catalog = multiple();
  catalog.default_library_id = "fluidr3-gm";
  const registry = registry_from_catalog(catalog, catalog_url);
  const player = new MidiPlaybackController({ instrument_registry: registry });
  // A program change before note-on selects GM flute, rather than the piano fallback.
  const { midi_file } = await import("./midi_audio_fakes.js");
  const bytes = [...midi_file()];
  bytes[21] += 3;
  bytes.splice(22, 0, 0, 192, 73);
  player.load(new Uint8Array(bytes));
  const route = Object.keys(player.instruments.assignments)[0];
  assert.equal(player.instruments.assignments[route], "original");
  assert.equal(
    player.instruments.registry.resolve(player.song.notes[0], "original")
      .instrument_id,
    "asset-fluidr3-gm-flute",
  );
  player.set_instrument(route, "grandb");
  player.load(new Uint8Array(bytes));
  assert.equal(player.instruments.assignments[route], "original");
  player.set_library("legacy");
  player.load(new Uint8Array(bytes));
  assert.equal(player.instruments.registry.default_library_id, "legacy");
  assert.equal(player.instruments.assignments[route], "original");
  await player.dispose();
});

test("late default discovery adopts FluidR3 for automatic routes and preserves explicit overrides", async () => {
  const catalog = multiple();
  catalog.default_library_id = "fluidr3-gm";
  const registry = registry_from_catalog(catalog, catalog_url);
  const { midi_file } = await import("./midi_audio_fakes.js");
  const player = new MidiPlaybackController({
    catalog_loader: async () => ({ registry, catalog }),
  });
  player.load(midi_file());
  const route = Object.keys(player.instruments.assignments)[0];
  await player.refresh_catalog();
  assert.equal(player.instruments.registry.default_library_id, "fluidr3-gm");
  assert.equal(player.instruments.assignments[route], "original");
  // The fixture only contains FluidR3 flute; no silent piano fallback is allowed.
  assert.equal(registry.can_assign(player.song.notes, "original"), false);
  player.set_instrument(route, "grandb");
  await player.refresh_catalog();
  assert.equal(player.instruments.assignments[route], "grandb");
  await player.dispose();
});

const drum_catalog = () => ({
  schema_version: 1,
  library_version: 5,
  revision: "a".repeat(64),
  default_library_id: "legacy",
  instruments: [],
  libraries: [
    {
      id: "legacy",
      name: "Legacy",
      version: "1",
      source_format: "chromatic-mp3",
      status: "active",
      percussion_library_id: "fluidr3-percussion",
    },
    {
      id: "fluidr3-percussion",
      name: "FluidR3 percussion",
      version: "1",
      source_format: "sf2",
      status: "audited",
      license: "MIT",
    },
  ],
  drum_kits: [
    {
      id: "fluidr3-percussion-kit-standard",
      library_id: "fluidr3-percussion",
      kit_key: "standard",
      kind: "drum-kit",
      name: "Standard",
      midi_program: 0,
      midi_bank: { msb: 0, lsb: 0 },
      source_preset: { bank: 128, program: 0 },
      source_sha256: "b".repeat(64),
      enabled: false,
      verification_status: "source_audited",
      coverage_status: "source-audited",
      playback_mode: "one-shot",
      notes: [35, 42, 44, 46].map((midi_note) => ({
        midi_note,
        velocity_ranges: [[1, 127]],
      })),
      choke_groups: [{ source_exclusive_class: 1, midi_notes: [42, 44, 46] }],
      recordings: [],
      playback_assets: [],
    },
  ],
});

test("audited drum kits use explicit program, note, velocity and choke identities", () => {
  const catalog = drum_catalog(),
    metadata = catalog_libraries(catalog);
  assert.equal(metadata.drum_kits.length, 1);
  assert.deepEqual(
    metadata.drum_kits[0].choke_groups[0].midi_notes,
    [42, 44, 46],
  );
  assert.equal(metadata.default_library_id, "legacy");
  const old = drum_catalog();
  delete old.drum_kits;
  assert.deepEqual(catalog_libraries(old).drum_kits, []);
});

test("drum catalog rejects ambiguous mappings, premature activation and malformed source identity", () => {
  const cases = [
    (c) => (c.drum_kits = null),
    (c) => (c.drum_kits[0].enabled = true),
    (c) => (c.drum_kits[0].verification_status = "playback_verified"),
    (c) => (c.drum_kits[0].playback_assets = [{}]),
    (c) => (c.drum_kits[0].recordings = [{}]),
    (c) => (c.drum_kits[0].id = "standard"),
    (c) => (c.drum_kits[0].kind = "single"),
    (c) => (c.drum_kits[0].source_sha256 = "bad"),
    (c) => (c.drum_kits[0].midi_bank.msb = 128),
    (c) => (c.drum_kits[0].midi_program = 128),
    (c) => (c.drum_kits[0].source_preset.program = 1),
    (c) => c.drum_kits[0].notes.push(c.drum_kits[0].notes[0]),
    (c) => (c.drum_kits[0].notes[0].midi_note = -1),
    (c) => (c.drum_kits[0].notes[0].velocity_ranges = [[0, 127]]),
    (c) =>
      (c.drum_kits[0].notes[0].velocity_ranges = [
        [1, 90],
        [80, 127],
      ]),
    (c) => (c.drum_kits[0].choke_groups[0].midi_notes = [42, 42]),
    (c) => (c.drum_kits[0].choke_groups[0].midi_notes = [127]),
    (c) =>
      c.drum_kits[0].choke_groups.push({
        source_exclusive_class: 2,
        midi_notes: [42],
      }),
    (c) => {
      const copy = structuredClone(c.drum_kits[0]);
      copy.id = "fluidr3-percussion-kit-other";
      copy.kit_key = "other";
      c.drum_kits.push(copy);
    },
    (c) => (c.libraries[0].percussion_library_id = "missing"),
    (c) => (c.libraries[1].percussion_library_id = "fluidr3-percussion"),
    (c) =>
      c.instruments.push({ ...c.drum_kits[0], instrument_key: "kit-standard" }),
  ];
  for (const mutate of cases) {
    const catalog = drum_catalog();
    mutate(catalog);
    assert.throws(() => catalog_libraries(catalog));
  }
});

test("percussion metadata never becomes a melodic provider, including prepared verification opt-in", () => {
  const catalog = drum_catalog();
  for (const allow_prepared of [false, true]) {
    const registry = registry_from_catalog(catalog, catalog_url, {
      allow_prepared,
    });
    assert.deepEqual(Object.keys(registry.providers), ["grandb"]);
    assert.equal(
      registry.can_assign([{ ...note(), channel: 9, pitch: 42 }], "original"),
      false,
    );
    assert.equal(registry.can_select_library("fluidr3-percussion"), false);
  }
});

test("prepared kits validate bounded hit/velocity mappings while remaining disabled", () => {
  const catalog = drum_catalog();
  catalog.drum_kits = [prepared_kit(catalog.drum_kits[0]).kit];
  assert.equal(
    catalog_libraries(catalog).drum_kits[0].verification_status,
    "assets_prepared",
  );
  for (const mutate of [
    (k) => (k.enabled = true),
    (k) => k.playback_assets[0].frames++,
    (k) => (k.playback_assets[0].source_sha256 = "0".repeat(64)),
    (k) => (k.playback_assets[0].hits[0].velocity_min = 2),
    (k) => (k.playback_assets[0].hits[0].render_velocity = 10),
    (k) => (k.playback_assets[0].hits[0].offset_frames = 1),
    (k) => (k.playback_assets[0].hits[0].frames = 30 * 48000 + 1),
    (k) => (k.playback_assets[0].hits[1].midi_note = 35),
    (k) => k.playback_assets[0].hits.pop(),
    (k) => (k.rendering.config_sha256 = "bad"),
  ]) {
    const copy = structuredClone(catalog);
    mutate(copy.drum_kits[0]);
    assert.throws(() => catalog_libraries(copy));
  }
});

test("prepared kit audio remains outside melodic providers even with prepared-source opt-in", () => {
  const catalog = drum_catalog();
  catalog.drum_kits = [prepared_kit(catalog.drum_kits[0]).kit];
  const registry = registry_from_catalog(catalog, catalog_url, {
    allow_prepared: true,
  });
  assert.deepEqual(Object.keys(registry.providers), ["grandb"]);
  assert.equal(
    registry.can_assign([{ ...note(), channel: 9 }], "original"),
    false,
  );
});

test("verified drum assets retain disabled metadata until engine integration", () => {
  const catalog = drum_catalog(),
    kit = prepared_kit(catalog.drum_kits[0]).kit;
  kit.verification_status = "playback_verified";
  catalog.drum_kits = [kit];
  assert.equal(catalog_libraries(catalog).drum_kits[0].enabled, false);
  kit.enabled = true;
  assert.throws(() => catalog_libraries(catalog));
});

test("verified active kits resolve through the melodic library link with strict channel/bank/program identities", () => {
  const catalog = drum_catalog(),
    kit = prepared_kit(catalog.drum_kits[0]).kit;
  kit.enabled = true;
  kit.verification_status = "playback_verified";
  kit.available = true;
  catalog.libraries[1].status = "active";
  catalog.drum_kits = [kit];
  for (const asset of kit.playback_assets) {
    asset.available = true;
    asset.url = `/instruments/${kit.id}/audio/${asset.id}?v=${asset.sha256}`;
  }
  const registry = registry_from_catalog(catalog, catalog_url),
    hit = { ...note(), channel: 9, pitch: 42, program: 0 },
    id = `asset-${kit.id}`;
  assert.equal(registry.can_assign([hit], "original"), true);
  const sample = registry.resolve(hit, "original");
  assert.equal(sample.playback_mode, "one-shot");
  assert.equal(sample.choke_group, 1);
  assert.equal(sample.gain, 100 / 127);
  assert.equal(sample.credentials, "include");
  assert.equal(registry.can_select_library(kit.library_id), false);
  for (const patch of [
    { pitch: 26 },
    { velocity: 0 },
    { program: 1 },
    { bank_msb: 1 },
    { bank_lsb: 1 },
  ])
    assert.equal(
      registry.can_assign([{ ...hit, ...patch }], "original"),
      false,
    );
  assert.equal(registry.can_assign([{ ...hit, channel: 0 }], id), false);
  const broken = structuredClone(catalog);
  broken.drum_kits[0].playback_assets[0].url += "bad";
  assert.throws(() => registry_from_catalog(broken, catalog_url));
  delete catalog.libraries[0].percussion_library_id;
  assert.equal(
    registry_from_catalog(catalog, catalog_url).can_assign([hit], "original"),
    false,
  );
});
