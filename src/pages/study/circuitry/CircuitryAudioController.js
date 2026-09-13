import {
  create_mono_audio_buffer,
  create_phase_accumulator,
  render_waveform_samples,
} from "./CircuitryAudioUtils.js";

const DEFAULT_FREQUENCY_HZ = 440;
const DEFAULT_DURATION_SECONDS = 10;
const AUDIO_FADE_SECONDS = 0.03;

/**
 * Own the browser-specific Web Audio lifecycle for a circuitry waveform.
 *
 * Waveform construction remains in CircuitryAudioUtils; this controller only
 * turns a ready profile into a browser audio source and manages its lifetime.
 * A callback reports playing-state changes without coupling the controller to
 * React or any particular page.
 */
export class CircuitryAudioController {
  audio_context = null;
  audio_source = null;
  audio_gain = null;
  disposed = false;

  /**
   * @param {{on_playing_changed?:(playing:boolean)=>void}} [options]
   *   Optional state notification callback.
   */
  constructor({ on_playing_changed } = {}) {
    this.on_playing_changed = on_playing_changed;
  }

  notify_playing = (playing) => {
    this.on_playing_changed?.(playing);
  };

  finish_audio = (audio_source, audio_gain, audio_context) => {
    try {
      audio_source?.disconnect();
    } catch (error) {
      // The source may already have been disconnected by the browser.
    }
    try {
      audio_gain?.disconnect();
    } catch (error) {
      // The gain node may already have been disconnected by the browser.
    }
    audio_context?.close();
    if (this.audio_source === audio_source) {
      this.audio_source = null;
      this.audio_gain = null;
      this.audio_context = null;
      this.notify_playing(false);
    }
  };

  /**
   * Stop the active source, optionally allowing its release envelope to run.
   * @param {boolean} [immediate=false] Skip the release envelope when true.
   */
  stop = (immediate = false) => {
    const audio_source = this.audio_source;
    const audio_gain = this.audio_gain;
    const audio_context = this.audio_context;
    if (!audio_source || !audio_context) {
      this.notify_playing(false);
      return;
    }
    if (!immediate && audio_gain) {
      const now = audio_context.currentTime;
      const stop_at = now + AUDIO_FADE_SECONDS;
      if (typeof audio_gain.gain.cancelAndHoldAtTime === "function") {
        audio_gain.gain.cancelAndHoldAtTime(now);
      } else {
        audio_gain.gain.cancelScheduledValues(now);
        audio_gain.gain.setValueAtTime(audio_gain.gain.value, now);
      }
      audio_gain.gain.linearRampToValueAtTime(0, stop_at);
      audio_source.onended = () =>
        this.finish_audio(audio_source, audio_gain, audio_context);
      try {
        audio_source.stop(stop_at);
      } catch (error) {
        this.finish_audio(audio_source, audio_gain, audio_context);
      }
      return;
    }
    audio_source.onended = null;
    try {
      audio_source.stop();
    } catch (error) {
      // The source may already have ended naturally.
    }
    this.finish_audio(audio_source, audio_gain, audio_context);
  };

  /**
   * Play a normalized waveform profile once at the requested tone.
   * @param {Array<{unwrapped_t:number,audio_value:number}>} profile Waveform.
   * @param {{frequency_hz?:number,duration_seconds?:number}} [options] Audio
   *   playback settings.
   * @returns {Promise<boolean>} Whether playback was successfully started.
   */
  play = async (profile, options = {}) => {
    if (this.disposed || !Array.isArray(profile) || profile.length < 2) {
      return false;
    }
    const AudioContextClass =
      typeof window !== "undefined" &&
      (window.AudioContext || window.webkitAudioContext);
    if (!AudioContextClass) {
      return false;
    }
    this.stop(true);
    const audio_context = new AudioContextClass();
    this.audio_context = audio_context;
    try {
      await audio_context.resume();
    } catch (error) {
      this.finish_audio(null, null, audio_context);
      return false;
    }
    if (this.disposed || this.audio_context !== audio_context) {
      audio_context.close();
      return false;
    }
    const frequency_hz = Number(options.frequency_hz) || DEFAULT_FREQUENCY_HZ;
    const duration_seconds =
      Number(options.duration_seconds) || DEFAULT_DURATION_SECONDS;
    const phase_accumulator = create_phase_accumulator(
      frequency_hz,
      audio_context.sampleRate,
    );
    const samples = render_waveform_samples(
      profile,
      phase_accumulator,
      Math.floor(audio_context.sampleRate * duration_seconds),
    );
    const audio_buffer = create_mono_audio_buffer(audio_context, samples);
    if (!audio_buffer || this.audio_context !== audio_context) {
      audio_context.close();
      return false;
    }
    const audio_source = audio_context.createBufferSource();
    const audio_gain = audio_context.createGain();
    audio_source.buffer = audio_buffer;
    const start_at = audio_context.currentTime;
    const end_at = start_at + duration_seconds;
    audio_gain.gain.setValueAtTime(0, start_at);
    audio_gain.gain.linearRampToValueAtTime(
      1,
      start_at + AUDIO_FADE_SECONDS,
    );
    audio_gain.gain.setValueAtTime(1, end_at - AUDIO_FADE_SECONDS);
    audio_gain.gain.linearRampToValueAtTime(0, end_at);
    audio_source.connect(audio_gain);
    audio_gain.connect(audio_context.destination);
    audio_source.onended = () => {
      if (this.audio_source === audio_source) {
        this.finish_audio(audio_source, audio_gain, audio_context);
      }
    };
    this.audio_source = audio_source;
    this.audio_gain = audio_gain;
    audio_source.start();
    this.notify_playing(true);
    return true;
  };

  /** Release all resources and prevent future playback. */
  dispose = () => {
    this.disposed = true;
    this.stop(true);
    this.on_playing_changed = null;
  };
}
