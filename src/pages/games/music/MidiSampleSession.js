import { DEFAULT_INSTRUMENT } from "@fracto/sdk/music/MidiInstruments.js";
import { midi_route_id } from "./MidiMixer.js";
import { decoded_asset_bytes, sample_window } from "./MidiSampleAsset.js";
import { sample_reservation } from "./MidiSampleLoader.js";

// A song keeps buffer-free descriptors. Only the cache and currently sounding
// voices own AudioBuffers, so evicting a completed sample actually releases it.
export default class MidiSampleSession {
  constructor(cache, notes, context, signal, options) {
    Object.assign(this, { cache, notes, context, signal, options });
    this.samples = notes.map((note) =>
      options.registry.resolve(
        note,
        options.assignments[midi_route_id(note)] ?? DEFAULT_INSTRUMENT,
        { sample_root: cache.sample_root },
      ),
    );
    this.assets = new Map();
    this.samples.forEach((sample, index) =>
      this.assets.set(sample.cache_key, { sample, note: notes[index] }),
    );
    this.pins = new Map();
    this.pending = null;
    this.prepared_keys = "";
    this.error = null;
    const assets = [...this.assets.values()].map((value) => value.sample);
    this.estimated_bytes = assets.reduce(
      (sum, sample) => sum + decoded_asset_bytes(sample, context),
      0,
    );
    const transient = Math.max(
      0,
      ...assets.map(
        (sample) =>
          sample_reservation(sample, context) -
          decoded_asset_bytes(sample, context),
      ),
    );
    this.mode =
      this.estimated_bytes + transient <= cache.max_bytes
        ? "preload"
        : "windowed";
    this.lookahead_seconds = 5;
  }
  async prepare(position = 0, index = 0) {
    if (this.pending) {
      await this.pending;
      return this.prepare(position, index);
    }
    if (this.signal.aborted) return;
    let required;
    let ahead = this.lookahead_seconds;
    while (true) {
      required = new Set(this.pins.keys());
      if (this.mode === "preload")
        for (const key of this.assets.keys()) required.add(key);
      else
        for (
          let i = index;
          i < this.notes.length &&
          this.notes[i].start_seconds <= position + ahead;
          i++
        )
          required.add(this.samples[i].cache_key);
      if (index < this.samples.length)
        required.add(this.samples[index].cache_key);
      const values = [...required].map((key) => this.assets.get(key).sample);
      const decoded = values.reduce((sum, sample) => {
        const buffer = this.cache.buffers.get(sample.cache_key);
        return (
          sum +
          (buffer
            ? buffer.length * buffer.numberOfChannels * 4
            : decoded_asset_bytes(sample, this.context))
        );
      }, 0);
      const overhead = Math.max(
        0,
        ...values.map(
          (sample) =>
            sample_reservation(sample, this.context) -
            decoded_asset_bytes(sample, this.context),
        ),
      );
      if (
        decoded + overhead <= this.cache.max_bytes ||
        ahead <= 0.15 ||
        this.mode === "preload"
      )
        break;
      ahead = Math.max(0.15, ahead / 2);
    }
    const signature = [...required].sort().join("\n");
    if (
      signature === this.prepared_keys &&
      [...required].every((key) => this.cache.buffers.has(key))
    )
      return;
    const notes = [...required].map((key) => this.assets.get(key).note);
    this.pending = this.cache.prepare(
      notes,
      this.context,
      this.signal,
      this.options,
    );
    try {
      await this.pending;
      this.prepared_keys = signature;
    } finally {
      this.pending = null;
    }
  }
  prefetch(position, index) {
    if (this.pending || this.signal.aborted || this.error) return;
    // Consume all speculative failures; the scheduler reports them on its next
    // pump, keeping Stop/replacement cancellation generation-safe.
    void this.prepare(position, index).catch((error) => {
      if (!this.signal.aborted) this.error = error;
    });
  }
  acquire(index) {
    if (this.error) throw this.error;
    const sample = this.samples[index];
    const buffer = this.cache.buffers.get(sample.cache_key);
    if (!buffer) return null;
    sample_window(sample, buffer);
    this.pins.set(sample.cache_key, (this.pins.get(sample.cache_key) ?? 0) + 1);
    let released = false;
    return {
      ...sample,
      buffer,
      release_buffer: () => {
        if (released) return;
        released = true;
        const count = this.pins.get(sample.cache_key) - 1;
        if (count) this.pins.set(sample.cache_key, count);
        else this.pins.delete(sample.cache_key);
      },
    };
  }
  diagnostics() {
    return {
      mode: this.mode,
      assets: this.assets.size,
      estimated_bytes: this.estimated_bytes,
      decoded_bytes: this.cache.bytes,
      reserved_bytes: this.cache.budget.reserved,
      peak_decoded_bytes: this.cache.peak_decoded_bytes,
      peak_managed_bytes: this.cache.budget.peak_bytes,
      decode_jobs: this.cache.budget.active,
      peak_decode_jobs: this.cache.budget.peak_jobs,
    };
  }
}
