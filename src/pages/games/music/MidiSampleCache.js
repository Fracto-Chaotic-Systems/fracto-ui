import { MidiPlaybackError } from "./MidiPianoSamples.js";
import { INSTRUMENT_REGISTRY, DEFAULT_INSTRUMENT } from "./MidiInstruments.js";
import { midi_route_id } from "./MidiMixer.js";
import {
  decoded_asset_bytes,
  sample_window,
  verify_asset_bytes,
} from "./MidiSampleAsset.js";
const MAX_CACHE_BYTES = 256 * 1024 * 1024;

export default class MidiSampleCache {
  constructor({
    fetch_sample = (...args) => fetch(...args),
    sample_root,
    concurrency = 4,
    max_bytes = MAX_CACHE_BYTES,
  } = {}) {
    Object.assign(this, { fetch_sample, sample_root, concurrency, max_bytes });
    this.buffers = new Map();
    this.bytes = 0;
    this.preparation = null;
  }
  clear() {
    this.preparation?.abort();
    this.preparation = null;
    this.buffers.clear();
    this.bytes = 0;
  }
  async prepare(
    notes,
    context,
    signal,
    { registry = INSTRUMENT_REGISTRY, assignments = {} } = {},
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
      for (const [key, buffer] of this.buffers) {
        if (!assets.has(key)) {
          this.bytes -= buffer.length * buffer.numberOfChannels * 4;
          this.buffers.delete(key);
        }
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
      const memory_error = () =>
        new MidiPlaybackError(
          "sample_memory_limit",
          "This song requires more than the instrument sample memory limit.",
        );
      if (estimate > this.max_bytes) throw memory_error();
      const keys = [...assets.keys()];
      let next = 0;
      await Promise.all(
        Array.from(
          { length: Math.min(this.concurrency, keys.length) },
          async () => {
            while (next < keys.length) {
              check();
              const key = keys[next++],
                sample = assets.get(key);
              if (this.buffers.has(key)) continue;
              let buffer;
              try {
                const response = await this.fetch_sample(sample.url, {
                  signal: request.signal,
                  credentials: sample.credentials ?? "omit",
                });
                check();
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const bytes = await response.arrayBuffer();
                check();
                await verify_asset_bytes(sample, bytes);
                check();
                buffer = await context.decodeAudioData(bytes);
              } catch (error) {
                check();
                if (error instanceof MidiPlaybackError) throw error;
                throw new MidiPlaybackError(
                  "sample_load_failed",
                  "Unable to download or decode a required instrument sample.",
                );
              }
              check();
              if (
                !Number.isFinite(buffer.duration) ||
                buffer.duration <= 0 ||
                !Number.isSafeInteger(buffer.length) ||
                buffer.length <= 0 ||
                !Number.isSafeInteger(buffer.numberOfChannels) ||
                buffer.numberOfChannels <= 0
              )
                throw new MidiPlaybackError(
                  "invalid_sample",
                  "An instrument sample contains no usable audio.",
                );
              if (
                sample.asset_frames &&
                (buffer.numberOfChannels !== sample.asset_channels ||
                  Math.abs(
                    buffer.duration -
                      sample.asset_frames / sample.asset_sample_rate,
                  ) >
                    2 /
                      (buffer.sampleRate ||
                        context.sampleRate ||
                        sample.asset_sample_rate))
              )
                throw new MidiPlaybackError(
                  "invalid_sample",
                  "Decoded instrument audio differs from its catalog.",
                );
              const bytes = buffer.length * buffer.numberOfChannels * 4;
              if (this.bytes + bytes > this.max_bytes) throw memory_error();
              this.buffers.set(key, buffer);
              this.bytes += bytes;
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
