import { loading_task } from "./MidiLoadingTask.js";
import { sample_window } from "./MidiSampleAsset.js";
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
    on_catalog = () => {},
    catalog_loader,
    instrument_registry,
    create_context = () => new AudioContext(),
    fetch_sample,
    sample_root,
    load_timeout_ms,
    resume_timeout_ms = 15000,
    set_interval,
    clear_interval,
  } = {}) {
    Object.assign(this, {
      on_status,
      on_mix,
      on_instruments,
      on_catalog,
      catalog_loader,
      create_context,
      set_interval,
      clear_interval,
      resume_timeout_ms,
    });
    this.instruments = new MidiInstrumentAssignments(instrument_registry);
    this.mixer = new MidiMixer();
    this.cache = new MidiSampleCache({
      fetch_sample,
      sample_root,
      load_timeout_ms,
    });
    this.catalog_request = null;
    this.catalog_state = {
      status: "idle",
      registry: this.instruments.registry,
      catalog: null,
    };
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
      loading_progress:
        this.status === "loading" ? this.loading_progress : null,
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
    this.stop({ cancel_catalog: false });
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
    this.stop({ cancel_catalog: false });
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
      this.loading_progress = null;
      this.notify("loading");
      if (stale()) return false;
      if (!this.context) {
        this.context = this.create_context();
        this.master = this.context.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.context.destination);
      }
      const context = this.context;
      await loading_task(
        () => context.resume(),
        request.signal,
        this.resume_timeout_ms,
        "audio_resume_timeout",
      );
      if (stale()) return false;
      const samples = await this.cache.prepare(
        song.notes,
        context,
        request.signal,
        {
          registry: this.instruments.registry,
          assignments: this.instruments.assignments,
          on_progress: (progress) => {
            if (stale()) return;
            this.loading_progress = progress;
            this.on_status(this.snapshot());
          },
        },
      );
      if (stale()) return false;
      this.warnings = [...song.warnings];
      const short = song.notes.filter(
        (note, index) =>
          samples[index].playback_mode !== "one-shot" &&
          note.end_seconds - note.start_seconds >
          sample_window(samples[index]).duration,
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

  stop({ cancel_catalog = true } = {}) {
    if (this.disposed) return;
    ++this.generation;
    if (cancel_catalog && this.catalog_request) {
      this.catalog_request.abort();
      this.catalog_request = null;
      this.catalog_state = {
        ...this.catalog_state,
        status: this.catalog_state.catalog ? "ready" : "idle",
        error: null,
      };
      this.on_catalog(this.catalog_state);
    }
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

  async refresh_catalog() {
    if (this.disposed || !this.catalog_loader) return false;
    this.catalog_request?.abort();
    const request = new AbortController();
    this.catalog_request = request;
    const publish = (update) => {
      this.catalog_state = { ...this.catalog_state, ...update };
      this.on_catalog(this.catalog_state);
    };
    publish({ status: "loading", error: null });
    if (
      this.disposed ||
      request.signal.aborted ||
      this.catalog_request !== request
    )
      return false;
    try {
      const { registry, catalog } = await this.catalog_loader(request.signal);
      if (
        this.disposed ||
        request.signal.aborted ||
        this.catalog_request !== request
      )
        return false;
      this.catalog_request = null;
      const previous = this.instruments.source_signature();
      this.instruments.replace_registry(registry);
      if (previous !== this.instruments.source_signature()) {
        this.stop({ cancel_catalog: false });
        this.cache.clear();
      }
      this.on_instruments(this.instruments.assignments);
      publish({
        status: "ready",
        registry: this.instruments.registry,
        catalog,
      });
      return true;
    } catch {
      if (
        this.disposed ||
        request.signal.aborted ||
        this.catalog_request !== request
      )
        return false;
      publish({ status: "error", error: "catalog_unavailable" });
      return false;
    } finally {
      if (this.catalog_request === request) this.catalog_request = null;
    }
  }

  set_mix(id, patch) {
    if (this.disposed || !this.song || !this.mixer.update(id, patch))
      return false;
    this.on_mix(this.mixer.mix);
    return true;
  }

  set_library(id) {
    if (this.disposed || !this.instruments.base_registry.can_select_library(id))
      return false;
    if (id === this.instruments.registry.default_library_id) return true;
    this.stop({ cancel_catalog: false });
    this.cache.clear();
    this.instruments.select_library(id);
    this.on_instruments(this.instruments.assignments);
    this.catalog_state = {
      ...this.catalog_state,
      registry: this.instruments.registry,
    };
    this.on_catalog(this.catalog_state);
    return true;
  }

  set_instrument(id, selection) {
    if (this.disposed || !this.song || !this.instruments.can_set(id, selection))
      return false;
    if (this.instruments.assignments[id] === selection) return true;
    this.stop({ cancel_catalog: false });
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
    this.on_catalog = () => {};
    this.catalog_state = null;
    return context ? context.close().catch(() => {}) : Promise.resolve();
  }
}
