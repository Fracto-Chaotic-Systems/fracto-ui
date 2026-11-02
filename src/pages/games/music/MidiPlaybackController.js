import { events_from_midi } from "./MidiEvents.js";
import { MidiPlaybackError } from "./MidiPianoSamples.js";
import MidiSampleCache from "./MidiSampleCache.js";
import MidiInstrumentAssignments from "./MidiInstrumentAssignments.js";
import MidiMixer from "./MidiMixer.js";
import MidiScheduler from "./MidiScheduler.js";

export default class MidiPlaybackController {
  constructor({
    on_status = () => {},
    on_mix = () => {},
    on_instruments = () => {},
    instrument_registry,
    create_context = () => new AudioContext(),
    fetch_sample,
    sample_root,
    set_interval,
    clear_interval,
  } = {}) {
    Object.assign(this, {
      on_status,
      on_mix,
      on_instruments,
      create_context,
      set_interval,
      clear_interval,
    });
    this.instruments = new MidiInstrumentAssignments(instrument_registry);
    this.mixer = new MidiMixer();
    this.cache = new MidiSampleCache({ fetch_sample, sample_root });
    this.song = null;
    this.context = null;
    this.master = null;
    this.scheduler = null;
    this.request = null;
    this.generation = 0;
    this.status = "idle";
    this.error = null;
    this.warnings = [];
    this.disposed = false;
  }

  snapshot() {
    return {
      status: this.status,
      playback_id: this.generation,
      clock_started: !!(
        this.scheduler && this.context.currentTime >= this.scheduler.origin
      ),
      error: this.error,
      warnings: [...this.warnings],
      duration_seconds: this.song?.duration_seconds ?? 0,
      position_seconds:
        this.status === "completed"
          ? this.song.duration_seconds
          : (this.scheduler?.position_seconds ?? 0),
    };
  }

  notify(status, error = null) {
    this.status = status;
    this.error = error
      ? { code: error.code ?? "playback_failed", message: error.message }
      : null;
    this.on_status(this.snapshot());
  }

  load(input) {
    if (this.disposed)
      throw new MidiPlaybackError(
        "disposed",
        "This MIDI player has been disposed.",
      );
    this.stop();
    this.song = null;
    this.on_mix(this.mixer.load(null));
    this.on_instruments(this.instruments.load(null));
    this.warnings = [];
    try {
      this.song = events_from_midi(input);
      this.on_mix(this.mixer.load(this.song));
      this.on_instruments(this.instruments.load(this.song));
      this.warnings = [...this.song.warnings];
      this.notify("ready");
      return this.song;
    } catch (error) {
      this.cache.clear();
      this.notify("error", error);
      throw error;
    }
  }

  unload() {
    if (this.disposed) return;
    this.stop();
    this.song = null;
    this.on_mix(this.mixer.load(null));
    this.on_instruments(this.instruments.load(null));
    this.warnings = [];
    this.cache.clear();
    this.notify("idle");
  }

  // Call from a Play gesture. Repeated Play never starts a second scheduler.
  async play() {
    if (this.disposed || this.request || this.scheduler) return false;
    if (!this.song) {
      this.notify(
        "error",
        new MidiPlaybackError("no_song", "Load a MIDI file before playing."),
      );
      return false;
    }
    const generation = ++this.generation;
    const request = new AbortController();
    this.request = request;
    const stale = () => this.disposed || generation !== this.generation;
    const song = this.song;
    try {
      this.notify("loading");
      if (stale()) return false;
      if (!this.context) {
        this.context = this.create_context();
        this.master = this.context.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.context.destination);
      }
      const context = this.context;
      await context.resume();
      if (stale()) return false;
      const samples = await this.cache.prepare(
        song.notes,
        context,
        request.signal,
        {
          registry: this.instruments.registry,
          assignments: this.instruments.assignments,
        },
      );
      if (stale()) return false;
      this.warnings = [...song.warnings];
      const short = song.notes.filter(
        (note, index) =>
          note.end_seconds - note.start_seconds >
          samples[index].buffer.duration,
      ).length;
      if (short)
        this.warnings.push({ code: "sample_shorter_than_note", count: short });
      this.mixer.connect(context, this.master);
      this.master.gain.setValueAtTime(1, context.currentTime);
      const scheduler = new MidiScheduler({
        context,
        destination: this.master,
        route_destination: (note) => this.mixer.destination(note),
        song,
        samples,
        set_interval: this.set_interval,
        clear_interval: this.clear_interval,
        on_complete: () => {
          if (stale()) return;
          this.scheduler = null;
          this.mixer.disconnect();
          this.notify("completed");
        },
        on_error: (error) => {
          if (stale()) return;
          this.stop();
          this.notify("error", error);
        },
      });
      this.scheduler = scheduler;
      this.notify("playing");
      if (stale()) return false;
      scheduler.start();
      return !stale() && this.status !== "error";
    } catch (error) {
      if (stale()) return false;
      this.stop();
      this.notify("error", error);
      return false;
    } finally {
      if (this.request === request) this.request = null;
    }
  }

  stop() {
    if (this.disposed) return;
    ++this.generation;
    this.request?.abort();
    this.request = null;
    if (this.master && this.context) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setValueAtTime(0, this.context.currentTime);
    }
    this.scheduler?.stop();
    this.scheduler = null;
    this.mixer.disconnect();
    this.notify(this.song ? "stopped" : "idle");
  }

  set_mix(id, patch) {
    if (this.disposed || !this.song || !this.mixer.update(id, patch))
      return false;
    this.on_mix(this.mixer.mix);
    return true;
  }

  set_instrument(id, selection) {
    if (this.disposed || !this.song || !this.instruments.can_set(id, selection))
      return false;
    if (this.instruments.assignments[id] === selection) return true;
    this.stop();
    this.instruments.set(id, selection);
    this.on_instruments(this.instruments.assignments);
    return true;
  }

  reset_mix() {
    if (this.disposed || !this.song) return;
    this.mixer.reset();
    this.on_mix(this.mixer.mix);
  }

  dispose() {
    if (this.disposed) return Promise.resolve();
    this.stop();
    this.disposed = true;
    this.song = null;
    this.mixer.load(null);
    this.instruments.load(null);
    this.cache.clear();
    this.master?.disconnect();
    const context = this.context;
    this.context = null;
    this.master = null;
    this.notify("disposed");
    this.on_status = () => {};
    this.on_mix = () => {};
    this.on_instruments = () => {};
    return context ? context.close().catch(() => {}) : Promise.resolve();
  }
}
