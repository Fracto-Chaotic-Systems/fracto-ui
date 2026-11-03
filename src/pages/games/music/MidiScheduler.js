import { schedule_midi_voice } from "./MidiVoice.js";

const LOOKAHEAD_SECONDS = 0.15;
const START_DELAY_SECONDS = 0.05;
const PUMP_INTERVAL_MS = 25;
const MAX_NOTES_PER_PUMP = 512;

// JS only feeds a short horizon; source starts/stops use the audio clock.
export default class MidiScheduler {
  constructor({
    context,
    destination,
    route_destination,
    song,
    samples,
    on_complete,
    on_error,
    set_interval = (callback, delay) => setInterval(callback, delay),
    clear_interval = (timer) => clearInterval(timer),
  }) {
    Object.assign(this, {
      context,
      destination,
      route_destination,
      song,
      samples,
      on_complete,
      on_error,
      set_interval,
      clear_interval,
    });
    this.voices = new Set();
    this.choke_groups = new Map();
    this.index = 0;
    this.timer = null;
    this.stopped = false;
    this.origin = context.currentTime + START_DELAY_SECONDS;
  }

  get position_seconds() {
    return Math.min(
      this.song.duration_seconds,
      Math.max(0, this.context.currentTime - this.origin),
    );
  }

  start() {
    this.timer = this.set_interval(() => this.pump(), PUMP_INTERVAL_MS);
    this.pump();
  }

  pump() {
    if (this.stopped) return;
    try {
      let count = 0;
      const horizon = this.context.currentTime + LOOKAHEAD_SECONDS;
      while (
        this.index < this.song.notes.length &&
        count++ < MAX_NOTES_PER_PUMP
      ) {
        const note = this.song.notes[this.index];
        if (this.origin + note.start_seconds > horizon) break;
        const sample = this.samples[this.index++];
        // Exclusive classes belong to a kit on a MIDI channel, including hits
        // split across tracks. Schedule the cut at the hit time, not pump time.
        const key =
          sample.playback_mode === "one-shot" && sample.choke_group
            ? `${note.channel}:${sample.instrument_id}:${sample.choke_group}`
            : null;
        const group = key ? (this.choke_groups.get(key) ?? new Set()) : null;
        if (group) {
          this.choke_groups.set(key, group);
          for (const previous of group)
            previous.choke(this.origin + note.start_seconds);
        }
        const voice = schedule_midi_voice(
          this.context,
          this.route_destination
            ? this.route_destination(note)
            : this.destination,
          note,
          sample,
          this.origin,
          (ended) => {
            this.voices.delete(ended);
            group?.delete(ended);
            if (key && !group.size) this.choke_groups.delete(key);
          },
        );
        if (voice) {
          this.voices.add(voice);
          group?.add(voice);
        } else if (key && !group.size) this.choke_groups.delete(key);
      }
      if (
        this.index === this.song.notes.length &&
        !this.voices.size &&
        this.context.currentTime >= this.origin + this.song.duration_seconds
      ) {
        this.stop();
        this.on_complete();
      }
    } catch (error) {
      this.stop();
      this.on_error(error);
    }
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    if (this.timer !== null) this.clear_interval(this.timer);
    this.timer = null;
    for (const voice of [...this.voices]) {
      try {
        voice.stop();
      } catch {
        /* Continue stopping the other voices. */
      }
    }
    this.voices.clear();
    this.choke_groups.clear();
  }
}
