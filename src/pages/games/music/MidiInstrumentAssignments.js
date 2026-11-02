import { midi_route_id } from "./MidiMixer.js";
import {
  DEFAULT_INSTRUMENT,
  ORIGINAL_INSTRUMENT,
  INSTRUMENT_REGISTRY,
} from "./MidiInstruments.js";

export default class MidiInstrumentAssignments {
  constructor(registry = INSTRUMENT_REGISTRY) {
    this.base_registry = registry;
    this.registry = registry;
    this.explicit_library = false;
    this.load(null);
  }
  load(song) {
    this.overrides = new Set();
    this.routes = new Map();
    for (const note of song?.notes ?? []) {
      const id = midi_route_id(note);
      if (!this.routes.has(id)) this.routes.set(id, []);
      this.routes.get(id).push(note);
    }
    this.assignments = Object.freeze(
      Object.fromEntries(
        [...this.routes.keys()].map((id) => [id, this.automatic_selection()]),
      ),
    );
    return this.assignments;
  }
  source_signature(registry = this.registry) {
    return JSON.stringify(
      [...this.routes].map(([id, notes]) => {
        const selection = this.assignments[id];
        if (!registry.can_assign(notes, selection))
          return [id, selection, null];
        return [
          id,
          selection,
          [
            ...new Set(
              notes.map((note) => registry.resolve(note, selection).cache_key),
            ),
          ].sort(),
        ];
      }),
    );
  }
  automatic_selection() {
    return this.registry.default_library_id === "legacy" &&
      !this.explicit_library
      ? DEFAULT_INSTRUMENT
      : ORIGINAL_INSTRUMENT;
  }
  reconcile() {
    this.assignments = Object.freeze(
      Object.fromEntries(
        [...this.routes].map(([id, notes]) => {
          const current = this.assignments[id];
          if (
            this.overrides.has(id) &&
            (current === ORIGINAL_INSTRUMENT ||
              this.registry.can_assign(notes, current))
          )
            return [id, current];
          this.overrides.delete(id);
          return [id, this.automatic_selection()];
        }),
      ),
    );
    return this.assignments;
  }
  select_library(id) {
    if (!this.base_registry.can_select_library(id)) return false;
    this.explicit_library = true;
    this.registry = this.base_registry.with_library(id);
    this.reconcile();
    return true;
  }
  replace_registry(registry) {
    const selected = this.registry.default_library_id;
    this.base_registry = registry;
    if (this.explicit_library && registry.can_select_library(selected))
      this.registry = registry.with_library(selected);
    else {
      this.explicit_library = false;
      this.registry = registry;
    }
    return this.reconcile();
  }
  can_set(id, selection) {
    const notes = this.routes.get(id);
    return !!notes && this.registry.can_assign(notes, selection);
  }
  set(id, selection) {
    this.overrides.add(id);
    this.assignments = Object.freeze({ ...this.assignments, [id]: selection });
  }
}
