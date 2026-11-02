import test from "node:test";
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
