import { MidiPlaybackError } from "./MidiPianoSamples.js";

export const sample_memory_error = () =>
  new MidiPlaybackError(
    "sample_memory_limit",
    "The active instrument samples exceed the playback memory limit.",
  );

// Lives for the cache's lifetime, not a preparation's. Cancelled/timed-out native
// decoders retain their slot and reservation until their actual promise settles.
export default class MidiSampleBudget {
  constructor(cache) {
    this.cache = cache;
    this.active = 0;
    this.reserved = 0;
    this.waiters = new Set();
    this.peak_bytes = 0;
    this.peak_jobs = 0;
  }
  async run(bytes, signal, operation) {
    const cancelled = () => {
      if (signal.aborted)
        throw new MidiPlaybackError(
          "cancelled",
          "MIDI sample loading was cancelled.",
        );
    };
    while (true) {
      cancelled();
      if (bytes > this.cache.max_bytes) throw sample_memory_error();
      if (
        this.active < this.cache.concurrency &&
        this.cache.bytes + this.reserved + bytes <= this.cache.max_bytes
      )
        break;
      if (!this.active) throw sample_memory_error();
      await new Promise((resolve) => {
        const wake = () => {
          this.waiters.delete(wake);
          signal.removeEventListener("abort", wake);
          resolve();
        };
        this.waiters.add(wake);
        signal.addEventListener("abort", wake, { once: true });
        if (signal.aborted) wake();
      });
    }
    this.active++;
    this.reserved += bytes;
    this.peak_jobs = Math.max(this.peak_jobs, this.active);
    this.peak_bytes = Math.max(
      this.peak_bytes,
      this.cache.bytes + this.reserved,
    );
    let held = true;
    const release = () => {
      if (!held) return;
      held = false;
      this.active--;
      this.reserved -= bytes;
      for (const wake of [...this.waiters]) wake();
    };
    try {
      return await operation(release);
    } finally {
      release();
    }
  }
}
