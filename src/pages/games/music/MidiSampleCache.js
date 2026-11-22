import { loading_task } from "./MidiLoadingTask.js";
import { MidiPlaybackError } from "@fracto/sdk/music/MidiPianoSamples.js";
import { INSTRUMENT_REGISTRY, DEFAULT_INSTRUMENT } from "@fracto/sdk/music/MidiInstruments.js";
import { midi_route_id } from "./MidiMixer.js";
import { decoded_asset_bytes, sample_window } from "./MidiSampleAsset.js";
import MidiSampleBudget, { sample_memory_error } from "./MidiSampleBudget.js";
import { load_cached_sample } from "./MidiSampleLoader.js";
const MAX_CACHE_BYTES = 256 * 1024 * 1024;

export default class MidiSampleCache {
  constructor({
    fetch_sample = (...args) => fetch(...args),
    sample_root,
    concurrency = 2,
    max_bytes = MAX_CACHE_BYTES,
    load_timeout_ms = 60000,
  } = {}) {
    Object.assign(this, {
      fetch_sample,
      sample_root,
      concurrency,
      max_bytes,
      load_timeout_ms,
    });
    this.buffers = new Map();
    this.bytes = 0;
    this.peak_decoded_bytes = 0;
    this.preparation = null;
    this.budget = new MidiSampleBudget(this);
  }
  clear() {
    this.preparation?.abort();
    this.preparation = null;
    this.buffers.clear();
    this.bytes = 0;
    // Reservations and decoder slots deliberately survive clear/cancellation.
  }
  async prepare(
    notes,
    context,
    signal,
    {
      registry = INSTRUMENT_REGISTRY,
      assignments = {},
      on_progress = () => {},
    } = {},
  ) {
    this.preparation?.abort();
    const request = new AbortController();
    this.preparation = request;
    const abort = () => request.abort();
    if (signal.aborted) request.abort();
    signal.addEventListener("abort", abort, { once: true });
    const check = () => {
      if (request.signal.aborted)
        throw new MidiPlaybackError(
          "cancelled",
          "MIDI sample loading was cancelled.",
        );
    };
    try {
      check();
      const samples = notes.map((note) =>
        registry.resolve(
          note,
          assignments[midi_route_id(note)] ?? DEFAULT_INSTRUMENT,
          { sample_root: this.sample_root },
        ),
      );
      const assets = new Map(
        samples.map((sample) => [sample.cache_key, sample]),
      );
      for (const [key, buffer] of this.buffers)
        if (!assets.has(key)) {
          this.bytes -= buffer.length * buffer.numberOfChannels * 4;
          this.buffers.delete(key);
        }
      const estimate = [...assets].reduce((sum, [key, sample]) => {
        const buffer = this.buffers.get(key);
        return (
          sum +
          (buffer
            ? buffer.length * buffer.numberOfChannels * 4
            : decoded_asset_bytes(sample, context))
        );
      }, 0);
      if (estimate > this.max_bytes) throw sample_memory_error();
      const keys = [...assets.keys()];
      let next = 0;
      let completed = keys.filter((key) => this.buffers.has(key)).length;
      on_progress({ completed, total: keys.length });
      await Promise.all(
        Array.from(
          { length: Math.min(this.concurrency, keys.length) },
          async () => {
            while (next < keys.length) {
              check();
              const key = keys[next++];
              if (this.buffers.has(key)) continue;
              try {
                await loading_task(
                  () =>
                    load_cached_sample(
                      this,
                      key,
                      assets.get(key),
                      context,
                      request.signal,
                      check,
                    ),
                  request.signal,
                  this.load_timeout_ms,
                  "sample_load_timeout",
                );
              } catch (error) {
                check();
                if (error instanceof MidiPlaybackError) throw error;
                throw new MidiPlaybackError(
                  "sample_load_failed",
                  "Unable to download or decode a required instrument sample.",
                );
              }
              check();
              on_progress({ completed: ++completed, total: keys.length });
            }
          },
        ),
      );
      check();
      return samples.map((sample) => {
        const buffer = this.buffers.get(sample.cache_key);
        sample_window(sample, buffer);
        return { ...sample, buffer };
      });
    } catch (error) {
      request.abort();
      throw error;
    } finally {
      signal.removeEventListener("abort", abort);
      if (this.preparation === request) this.preparation = null;
    }
  }
}
