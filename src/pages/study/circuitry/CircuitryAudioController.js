import {
  create_mono_audio_buffer,
  create_phase_accumulator,
  render_waveform_samples,
} from "./CircuitryAudioUtils.js";

const DEFAULT_FREQUENCY_HZ = 440;
const DEFAULT_DURATION_SECONDS = 10;
/** Replace the active source immediately before starting playback. */
export const AUDIO_TRANSITION_REPLACE = "replace";
/** Cross-fade the active source into the replacement source. */
export const AUDIO_TRANSITION_CROSSFADE = "crossfade";
/**
 * Supported source-transition modes. Exporting this map keeps callers from
 * duplicating string literals while preserving readable option values.
 */
export const AUDIO_TRANSITIONS = Object.freeze({
  REPLACE: AUDIO_TRANSITION_REPLACE,
  CROSSFADE: AUDIO_TRANSITION_CROSSFADE,
});
const SUPPORTED_AUDIO_TRANSITIONS = Object.values(AUDIO_TRANSITIONS);
// A 60 ms attack/release removes clicks while keeping the sample responsive.
const AUDIO_FADE_SECONDS = 0.06;
const MIN_AUDIO_FADE_SECONDS = 0.005;
const MAX_AUDIO_FADE_SECONDS = 1;
const AUDIO_ENVELOPE_SAMPLES = 32;

/**
 * Normalize controller playback options at the public boundary.
 * Cross-fade is a declared mode now; its source scheduling is introduced in
 * the subsequent controller steps. Until then it safely falls back to the
 * established replacement behavior.
 *
 * @param {object} options Caller-supplied playback options.
 * @returns {{frequency_hz:number,duration_seconds:number,transition:string,
 *   fade_seconds:number}}
 *   Validated playback options.
 */
const normalize_play_options = (options = {}) => ({
  frequency_hz: Number(options.frequency_hz) || DEFAULT_FREQUENCY_HZ,
  duration_seconds: Number(options.duration_seconds) || DEFAULT_DURATION_SECONDS,
  transition: SUPPORTED_AUDIO_TRANSITIONS.includes(options.transition)
    ? options.transition
    : AUDIO_TRANSITION_REPLACE,
  fade_seconds: Number.isFinite(Number(options.fade_seconds))
    ? Math.min(
        MAX_AUDIO_FADE_SECONDS,
        Math.max(MIN_AUDIO_FADE_SECONDS, Number(options.fade_seconds)),
      )
    : AUDIO_FADE_SECONDS,
});

/**
 * Build an equal-power envelope. Sine is used for attack and cosine for
 * release, which avoids the perceptual level dip of a linear amplitude ramp.
 *
 * @param {number} start_gain Starting gain.
 * @param {"in"|"out"} direction Envelope direction.
 * @returns {Float32Array} Gain curve for Web Audio setValueCurveAtTime().
 */
const create_equal_power_curve = (start_gain, direction) =>
  Float32Array.from({ length: AUDIO_ENVELOPE_SAMPLES }, (_, index) => {
    const progress = index / (AUDIO_ENVELOPE_SAMPLES - 1);
    const shape =
      direction === "in"
        ? Math.sin((progress * Math.PI) / 2)
        : Math.cos((progress * Math.PI) / 2);
    return start_gain * shape;
  });

/**
 * Schedule an equal-power gain envelope, with compatibility fallback.
 * @param {GainNode} audio_gain Gain node to automate.
 * @param {number} start_time Automation start time.
 * @param {number} duration Envelope duration in seconds.
 * @param {"in"|"out"} direction Envelope direction.
 * @param {number} [start_gain=1] Starting gain for the curve.
 */
const schedule_equal_power_envelope = (
  audio_gain,
  start_time,
  duration,
  direction,
  start_gain = 1,
) => {
  const curve = create_equal_power_curve(start_gain, direction);
  if (typeof audio_gain.gain.setValueCurveAtTime === "function") {
    audio_gain.gain.setValueCurveAtTime(curve, start_time, duration);
    return;
  }
  audio_gain.gain.linearRampToValueAtTime(
    direction === "in" ? start_gain : 0,
    start_time + duration,
  );
};

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
  // Invalidates play requests that are still awaiting AudioContext.resume().
  play_generation = 0;
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

  finish_audio = (audio_source, audio_gain) => {
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
    // Keep the context alive for the next source; dispose() closes it.
    if (this.audio_source === audio_source) {
      this.audio_source = null;
      this.audio_gain = null;
      this.notify_playing(false);
    }
  };

  /**
   * Release one source over the configured equal-power fade interval.
   * This method deliberately accepts explicit nodes so an old source can be
   * faded while a newly prepared source is already becoming active.
   *
   * @param {AudioBufferSourceNode} audio_source Source to release.
   * @param {GainNode} audio_gain Gain node attached to the source.
   * @param {BaseAudioContext} audio_context Context that schedules the fade.
   * @param {number} [fade_seconds=AUDIO_FADE_SECONDS] Fade duration.
   */
  fade_out_source = (
    audio_source,
    audio_gain,
    audio_context,
    fade_seconds = AUDIO_FADE_SECONDS,
  ) => {
    if (!audio_source || !audio_gain || !audio_context) {
      return;
    }
    const now = audio_context.currentTime;
    const stop_at = now + fade_seconds;
    if (typeof audio_gain.gain.cancelAndHoldAtTime === "function") {
      audio_gain.gain.cancelAndHoldAtTime(now);
    } else {
      audio_gain.gain.cancelScheduledValues(now);
      audio_gain.gain.setValueAtTime(audio_gain.gain.value, now);
    }
    schedule_equal_power_envelope(
      audio_gain,
      now,
      fade_seconds,
      "out",
      audio_gain.gain.value,
    );
    audio_source.onended = () =>
      this.finish_audio(audio_source, audio_gain);
    try {
      audio_source.stop(stop_at);
    } catch (error) {
      this.finish_audio(audio_source, audio_gain);
    }
  };

  /**
   * Stop the active source, optionally allowing its release envelope to run.
   * @param {boolean} [immediate=false] Skip the release envelope when true.
   */
  stop = (immediate = false) => {
    // A stop also cancels any source that has not yet been created by an
    // asynchronous play() call.
    this.play_generation += 1;
    const audio_source = this.audio_source;
    const audio_gain = this.audio_gain;
    const audio_context = this.audio_context;
    if (!audio_source || !audio_context) {
      this.notify_playing(false);
      return;
    }
    if (!immediate && audio_gain) {
      this.fade_out_source(
        audio_source,
        audio_gain,
        audio_context,
        AUDIO_FADE_SECONDS,
      );
      return;
    }
    audio_source.onended = null;
    try {
      audio_source.stop();
    } catch (error) {
      // The source may already have ended naturally.
    }
    this.finish_audio(audio_source, audio_gain);
  };

  /**
   * Construct an unscheduled waveform source. The returned nodes are not
   * started or owned by the controller until `play()` adopts them, allowing a
   * later cross-fade implementation to prepare a replacement source first.
   *
   * @param {Array<{unwrapped_t:number,audio_value:number}>} profile Waveform.
   * @param {BaseAudioContext} audio_context Context that will own the nodes.
   * @param {{frequency_hz:number,duration_seconds:number,fade_seconds:number}}
   *   playback_options
   *   Normalized playback settings.
   * @returns {{audio_source:AudioBufferSourceNode,audio_gain:GainNode,
   *   duration_seconds:number}|null} Prepared source nodes.
   */
  create_audio_source = (profile, audio_context, playback_options) => {
    const { frequency_hz, duration_seconds } = playback_options;
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
    if (!audio_buffer) {
      return null;
    }
    const audio_source = audio_context.createBufferSource();
    const audio_gain = audio_context.createGain();
    audio_source.buffer = audio_buffer;
    const start_at = audio_context.currentTime;
    const end_at = start_at + duration_seconds;
    audio_gain.gain.setValueAtTime(0, start_at);
    schedule_equal_power_envelope(
      audio_gain,
      start_at,
      playback_options.fade_seconds,
      "in",
      1,
    );
    audio_gain.gain.setValueAtTime(
      1,
      end_at - playback_options.fade_seconds,
    );
    schedule_equal_power_envelope(
      audio_gain,
      end_at - playback_options.fade_seconds,
      playback_options.fade_seconds,
      "out",
      1,
    );
    audio_source.connect(audio_gain);
    audio_gain.connect(audio_context.destination);
    return { audio_source, audio_gain, duration_seconds };
  };

  /**
   * Play a normalized waveform profile once at the requested tone.
   * @param {Array<{unwrapped_t:number,audio_value:number}>} profile Waveform.
   * @param {{frequency_hz?:number,duration_seconds?:number,
   *   fade_seconds?:number,
   *   transition?:"replace"|"crossfade"}} [options] Audio playback settings.
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
    const playback_options = normalize_play_options(options);
    const previous_source = this.audio_source;
    const previous_gain = this.audio_gain;
    if (playback_options.transition === AUDIO_TRANSITION_REPLACE) {
      this.stop(true);
    }
    const play_generation = ++this.play_generation;
    let audio_context = this.audio_context;
    if (!audio_context || audio_context.state === "closed") {
      audio_context = new AudioContextClass();
      this.audio_context = audio_context;
    }
    try {
      await audio_context.resume();
    } catch (error) {
      audio_context.close();
      if (this.audio_context === audio_context) {
        this.audio_context = null;
      }
      return false;
    }
    if (
      this.disposed ||
      this.audio_context !== audio_context ||
      this.play_generation !== play_generation
    ) {
      return false;
    }
    const prepared_source = this.create_audio_source(
      profile,
      audio_context,
      playback_options,
    );
    if (!prepared_source) {
      return false;
    }
    if (this.disposed || this.play_generation !== play_generation) {
      // The source has not started yet; disconnecting its nodes is sufficient
      // cleanup and avoids allowing a stale request to become audible.
      this.finish_audio(
        prepared_source.audio_source,
        prepared_source.audio_gain,
      );
      return false;
    }
    const { audio_source, audio_gain } = prepared_source;
    if (
      playback_options.transition === AUDIO_TRANSITION_CROSSFADE &&
      previous_source &&
      previous_gain &&
      previous_source !== audio_source
    ) {
      this.fade_out_source(
        previous_source,
        previous_gain,
        audio_context,
        playback_options.fade_seconds,
      );
    }
    audio_source.onended = () => {
      if (this.audio_source === audio_source) {
        this.finish_audio(audio_source, audio_gain);
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
    if (this.audio_context) {
      this.audio_context.close();
      this.audio_context = null;
    }
    this.on_playing_changed = null;
  };
}
