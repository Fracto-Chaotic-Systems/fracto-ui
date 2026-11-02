import { midi_route_id } from "./MidiMixer.js";
import { DEFAULT_INSTRUMENT, INSTRUMENT_REGISTRY } from "./MidiInstruments.js";

export default class MidiInstrumentAssignments {
  constructor(registry = INSTRUMENT_REGISTRY) {
    this.registry = registry;
    this.load(null);
  }
  load(song) {
    this.routes = new Map();
    for (const note of song?.notes ?? []) {
      const id = midi_route_id(note);
      if (!this.routes.has(id)) this.routes.set(id, []);
      this.routes.get(id).push(note);
    }
    this.assignments = Object.freeze(
      Object.fromEntries(
        [...this.routes.keys()].map((id) => [id, DEFAULT_INSTRUMENT]),
      ),
    );
    return this.assignments;
  }
  replace_registry(registry) {
    this.registry = registry;
    this.assignments = Object.freeze(
      Object.fromEntries(
        [...this.routes].map(([id, notes]) => [
          id,
          registry.can_assign(notes, this.assignments[id])
            ? this.assignments[id]
            : DEFAULT_INSTRUMENT,
        ]),
      ),
    );
    return this.assignments;
  }
  can_set(id, selection) {
    const notes = this.routes.get(id);
    return !!notes && this.registry.can_assign(notes, selection);
  }
  set(id, selection) {
    this.assignments = Object.freeze({ ...this.assignments, [id]: selection });
  }
}
