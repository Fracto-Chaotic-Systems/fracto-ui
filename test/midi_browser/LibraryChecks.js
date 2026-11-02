import { load_instrument_catalog } from "../../src/pages/games/music/MidiInstrumentCatalog.js";
import MidiSampleCache from "../../src/pages/games/music/MidiSampleCache.js";
import { schedule_midi_voice } from "../../src/pages/games/music/MidiVoice.js";

export async function verify_library(progress) {
  const { registry, catalog } = await load_instrument_catalog(
    `${location.origin}/api/asset/instruments`,
    { allow_prepared: true },
  );
  const results = [];
  for (const item of catalog.instruments) {
    const provider = registry.providers[`asset-${item.id}`];
    if (!provider) throw new Error(`Missing provider: ${item.id}`);
    const layers = [
      ...new Set(item.playback_assets.map((asset) => asset.velocity_layer)),
    ];
    const probes = [];
    for (const layer of layers) {
      const pitches = [
        ...new Set(
          item.playback_assets
            .filter((asset) => asset.velocity_layer === layer)
            .flatMap((asset) => asset.notes.map((note) => note.midi_pitch)),
        ),
      ].sort((a, b) => a - b);
      const velocity =
        layer === null ? 100 : { p: 1, mp: 32, mf: 64, f: 96, ff: 127 }[layer];
      for (const pitch of [
        pitches[0],
        pitches[Math.floor(pitches.length / 2)],
        pitches.at(-1),
      ]) {
        progress(`${item.name}: ${layer ?? "single"} pitch ${pitch}`);
        const context = new OfflineAudioContext(2, 48000, 48000);
        const cache = new MidiSampleCache({ concurrency: 1 });
        try {
          const note = {
            track: 0,
            channel: 0,
            pitch,
            velocity,
            program: 0,
            start_seconds: 0,
            end_seconds: 0.7,
          };
          const [sample] = await cache.prepare(
            [note],
            context,
            new AbortController().signal,
            { registry, assignments: { "track:0:channel:0": provider.id } },
          );
          schedule_midi_voice(
            context,
            context.destination,
            note,
            sample,
            0,
            () => {},
          );
          const output = await context.startRendering();
          let sum = 0,
            peak = 0;
          for (let channel = 0; channel < output.numberOfChannels; channel++)
            for (const value of output.getChannelData(channel)) {
              if (!Number.isFinite(value))
                throw new Error(`Nonfinite output: ${item.id}`);
              sum += value * value;
              peak = Math.max(peak, Math.abs(value));
            }
          const rms = Math.sqrt(
            sum / (output.length * output.numberOfChannels),
          );
          if (rms <= 1e-8)
            throw new Error(
              `Silent output: ${item.id}, ${layer}, ${pitch}, ${rms}`,
            );
          probes.push({ layer, pitch, velocity, rms, peak });
        } finally {
          cache.clear();
        }
      }
    }
    results.push({ id: item.id, probes });
  }
  return {
    pass: true,
    sample_rate: 48000,
    verification:
      "Chromium native offline decode/render through sample cache and voice engine; low/middle/high pitches of every recording layer. Not a subjective listening review.",
    instruments: results.length,
    probes: results.reduce((sum, item) => sum + item.probes.length, 0),
    results,
  };
}
