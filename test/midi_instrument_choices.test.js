import test from "node:test";
import MidiInstrumentAssignments from "../src/pages/games/music/MidiInstrumentAssignments.js";
import assert from "node:assert/strict";
import {
  create_instrument_registry,
  GRANDB_PROVIDER,
} from "../src/pages/games/music/MidiInstruments.js";
import {
  instrument_choices,
  effective_instrument,
} from "../src/pages/games/music/MidiInstrumentChoices.js";
const flute = {
  ...GRANDB_PROVIDER,
  id: "asset-flute",
  name: "Flute & strings <test>",
  label_key: undefined,
  programs: [],
  min_pitch: 60,
  max_pitch: 72,
};
const registry = create_instrument_registry([GRANDB_PROVIDER, flute]);
const notes = [{ pitch: 60, channel: 0, velocity: 100, program: 0 }];
const catalog = {
  instruments: [
    { id: "flute", name: flute.name, available: true, enabled: true },
    { id: "cello", name: "Cello", available: true, enabled: false },
    { id: "violin", name: "Violin", available: false, enabled: true },
  ],
};
test("catalog choices deduplicate providers, retain server names and explain unavailable inventory", () => {
  const choices = instrument_choices(notes, registry, catalog);
  assert.equal(choices.length, 4);
  assert.equal(choices[1].name, flute.name);
  assert.equal(choices[1].reason, null);
  assert.equal(choices[2].reason, "instrument_not_enabled");
  assert.equal(choices[3].reason, "instrument_assets_unavailable");
});
test("coverage and percussion gate assignment; missing discovery retains fallback", () => {
  assert.equal(
    instrument_choices([{ ...notes[0], pitch: 80 }], registry, catalog)[1]
      .reason,
    "instrument_coverage",
  );
  assert.ok(
    instrument_choices([{ ...notes[0], channel: 9 }], registry, catalog).every(
      (c) => c.reason,
    ),
  );
  assert.equal(
    instrument_choices(
      notes,
      create_instrument_registry([GRANDB_PROVIDER]),
      null,
    ).length,
    1,
  );
});
test("effective names use runtime providers, while original mappings remain explicit", () => {
  const text = (k) => k;
  assert.equal(
    effective_instrument(notes, "asset-flute", registry, text),
    flute.name,
  );
  assert.equal(
    effective_instrument(notes, "original", registry, text),
    "instrument_grandb",
  );
  assert.equal(
    effective_instrument(notes, "removed", registry, text),
    "instrument_not_playable",
  );
});

test("choices scope inventory to selected library and retain a named cross-library override", () => {
  const scoped = create_instrument_registry(
    [
      GRANDB_PROVIDER,
      flute,
      { ...flute, id: "fluid-flute", library_id: "fluidr3-gm" },
    ],
    { default_library_id: "fluidr3-gm" },
  );
  assert.deepEqual(
    instrument_choices(notes, scoped, catalog).map((c) => c.id),
    ["grandb", "fluid-flute"],
  );
  const choices = instrument_choices(notes, scoped, catalog, "asset-flute");
  assert.equal(choices.length, 3);
  assert.match(choices.find((c) => c.id === "asset-flute").name, /legacy/);
});

const kit = {
  ...flute,
  id: "asset-drums-kit-standard",
  library_id: "drums",
  name: "Standard",
  library_name: "Drum samples",
  percussion: true,
  programs: [0],
  min_pitch: 35,
  max_pitch: 81,
  sample: () => ({ url: "test.wav" }),
};
const drums = [{ ...notes[0], track: 0, channel: 9, pitch: 42 }];
const kit_registry = (providers = [kit]) =>
  create_instrument_registry([GRANDB_PROVIDER, flute, ...providers], {
    libraries: [
      { id: "legacy", status: "active", percussion_library_id: "drums" },
      { id: "drums", status: "active", source_format: "sf2" },
    ],
    default_library_id: "legacy",
  });

test("percussion choices show linked kits, unavailable inventory and exact coverage without melodic patches", () => {
  const inventory = {
    ...catalog,
    drum_kits: [
      {
        id: "drums-kit-standard",
        library_id: "drums",
        name: "Standard",
        available: true,
      },
      {
        id: "drums-kit-room",
        library_id: "drums",
        name: "Room",
        available: false,
      },
      {
        id: "drums-kit-brush",
        library_id: "drums",
        name: "Brush",
        available: true,
        assets_available: true,
        enabled: false,
      },
      { id: "other-kit", library_id: "other", name: "Other", available: false },
    ],
  };
  const choices = instrument_choices(drums, kit_registry(), inventory);
  assert.deepEqual(
    choices.map((c) => [c.name, c.reason]),
    [
      ["Standard", null],
      ["Room", "instrument_assets_unavailable"],
      ["Brush", "instrument_not_enabled"],
    ],
  );
  assert.equal(
    instrument_choices(
      [{ ...drums[0], pitch: 10 }],
      kit_registry(),
      inventory,
    )[0].reason,
    "instrument_coverage",
  );
  assert.ok(
    !instrument_choices(notes, kit_registry(), inventory).some(
      (c) => c.id === kit.id,
    ),
  );
  assert.equal(
    effective_instrument(drums, "original", kit_registry(), (k) => k),
    "Standard",
  );
});

test("percussion retains explicit compatible cross-library kits, then reconciles removed or incompatible sources", () => {
  const other = { ...kit, id: "other-kit", library_id: "other", name: "Other" };
  const registry = kit_registry([kit, other]),
    assignments = new MidiInstrumentAssignments(registry);
  assignments.load({ notes: drums });
  const route = "track:0:channel:9";
  assert.equal(assignments.assignments[route], "original");
  assignments.set(route, other.id);
  assert.match(
    instrument_choices(drums, registry, null, other.id).find(
      (c) => c.id === other.id,
    ).name,
    /Drum samples/,
  );
  assignments.replace_registry(kit_registry([kit, other]));
  assert.equal(assignments.assignments[route], other.id);
  assignments.replace_registry(kit_registry());
  assert.equal(assignments.assignments[route], "original");
  assert.equal(assignments.can_set(route, "grandb"), false);
  assert.equal(assignments.can_set(route, kit.id), true);
});
