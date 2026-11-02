import { MidiPlaybackError } from "./MidiPianoSamples.js";
import { INSTRUMENT_REGISTRY, DEFAULT_INSTRUMENT } from "./MidiInstruments.js";
import { midi_route_id } from "./MidiMixer.js";

const MAX_CACHE_BYTES = 256 * 1024 * 1024;

export default class MidiSampleCache {
  constructor({
    fetch_sample = (...args) => fetch(...args),
    sample_root,
    concurrency = 4,
    max_bytes = MAX_CACHE_BYTES,
  } = {}) {
    this.fetch_sample = fetch_sample;
    this.sample_root = sample_root;
    this.concurrency = concurrency;
    this.max_bytes = max_bytes;
    this.buffers = new Map();
    this.bytes = 0;
  }

  clear() {
    this.buffers.clear();
    this.bytes = 0;
  }

  async prepare(
    notes,
    context,
    signal,
    { registry = INSTRUMENT_REGISTRY, assignments = {} } = {},
  ) {
    // Validate every note before making any requests; no partial song playback.
    const samples = notes.map((note) =>
      registry.resolve(
        note,
        assignments[midi_route_id(note)] ?? DEFAULT_INSTRUMENT,
        { sample_root: this.sample_root },
      ),
    );
    const assets = new Map(
      samples.map((sample) => [sample.cache_key, sample.url]),
    );
    const keys = [...assets.keys()];
    const required = new Set(keys);
    // Retain the intersection for quick replay; release previous song samples.
    for (const [key, buffer] of this.buffers) {
      if (!required.has(key)) {
        this.bytes -= buffer.length * buffer.numberOfChannels * 4;
        this.buffers.delete(key);
      }
    }
    let next = 0;
    const check = () => {
      if (signal.aborted)
        throw new MidiPlaybackError(
          "cancelled",
          "MIDI sample loading was cancelled.",
        );
    };
    await Promise.all(
      Array.from(
        { length: Math.min(this.concurrency, keys.length) },
        async () => {
          while (next < keys.length) {
            check();
            const key = keys[next++];
            const url = assets.get(key);
            if (this.buffers.has(key)) continue;
            let buffer;
            try {
              const response = await this.fetch_sample(url, {
                signal,
                credentials: "omit",
              });
              check();
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const bytes = await response.arrayBuffer();
              check();
              buffer = await context.decodeAudioData(bytes);
            } catch (error) {
              check();
              throw new MidiPlaybackError(
                "sample_load_failed",
                "Unable to download or decode a required instrument sample.",
              );
            }
            check();
            if (
              !Number.isFinite(buffer.duration) ||
              buffer.duration <= 0 ||
              !buffer.length ||
              !buffer.numberOfChannels
            )
              throw new MidiPlaybackError(
                "invalid_sample",
                "An instrument sample contains no usable audio.",
              );
            const bytes = buffer.length * buffer.numberOfChannels * 4;
            if (this.bytes + bytes > this.max_bytes)
              throw new MidiPlaybackError(
                "sample_memory_limit",
                "This song requires more than the instrument sample memory limit.",
              );
            this.buffers.set(key, buffer);
            this.bytes += bytes;
          }
        },
      ),
    );
    check();
    return samples.map((sample) => ({
      ...sample,
      buffer: this.buffers.get(sample.cache_key),
    }));
  }
}
