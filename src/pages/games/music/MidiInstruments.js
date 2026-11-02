import { piano_sample, MidiPlaybackError } from "./MidiPianoSamples.js";
export const DEFAULT_INSTRUMENT = "grandb";
export const ORIGINAL_INSTRUMENT = "original";

export const GRANDB_PROVIDER = Object.freeze({
  id: DEFAULT_INSTRUMENT,
  version: "1",
  label_key: "instrument_grandb",
  verified: true,
  programs: Object.freeze([0]),
  min_pitch: 21,
  max_pitch: 108,
  percussion: false,
  sample: (note, options = {}) => piano_sample(note, options.sample_root),
});

// Providers are an explicit code-owned, verified catalog, never remote scripts.
export function create_instrument_registry(definitions) {
  const providers = Object.create(null);
  for (const definition of definitions) {
    if (!definition.verified) continue;
    if (
      !definition.id ||
      definition.id === ORIGINAL_INSTRUMENT ||
      Object.hasOwn(providers, definition.id) ||
      typeof definition.sample !== "function"
    )
      throw new Error("Invalid or duplicate instrument provider.");
    providers[definition.id] = Object.freeze({
      ...definition,
      programs: Object.freeze([...definition.programs]),
    });
  }
  Object.freeze(providers);
  const supports = (provider, note) =>
    !!provider &&
    (provider.percussion ? note.channel === 9 : note.channel !== 9) &&
    note.pitch >= provider.min_pitch &&
    note.pitch <= provider.max_pitch;
  const original = (note) => {
    // Only standard-bank mappings are verified. A numbered GM program alone
    // must not silently reinterpret a bank-select or percussion assignment.
    if ((note.bank_msb ?? 0) !== 0 || (note.bank_lsb ?? 0) !== 0) return null;
    return Object.values(providers).find(
      (provider) =>
        provider.programs.includes(note.program ?? 0) &&
        supports(provider, note),
    );
  };
  return Object.freeze({
    providers,
    can_assign(notes, selection) {
      return (
        notes.length > 0 &&
        notes.every((note) =>
          selection === ORIGINAL_INSTRUMENT
            ? !!original(note)
            : supports(providers[selection], note),
        )
      );
    },
    resolve(note, selection = DEFAULT_INSTRUMENT, options = {}) {
      const provider =
        selection === ORIGINAL_INSTRUMENT
          ? original(note)
          : providers[selection];
      if (!provider)
        throw new MidiPlaybackError(
          "instrument_unavailable",
          "No verified sound source supports this instrument assignment.",
        );
      if (!supports(provider, note))
        throw new MidiPlaybackError(
          note.channel === 9 ? "unsupported_percussion" : "unsupported_pitch",
          "This verified instrument cannot play that pitch or channel.",
        );
      const sample = provider.sample(note, options);
      return {
        ...sample,
        instrument_id: provider.id,
        cache_key: `${provider.id}@${provider.version}:${sample.url}`,
      };
    },
  });
}
export const INSTRUMENT_REGISTRY = create_instrument_registry([
  GRANDB_PROVIDER,
]);
