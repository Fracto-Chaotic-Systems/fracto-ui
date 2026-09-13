const FULL_TURN = 2 * Math.PI;

/**
 * Build the complete waveform profile from circuitry interpolation samples.
 * This is intentionally separate from the reduced ten-sample visualization
 * profile used by the metadata chart.
 *
 * @param {Array<{t:number,C:{re:number,im:number}}>|object|null} curve_samples
 *   Full interpolated curve samples, or a legacy circuitry response object.
 * @param {{re:number,im:number}|undefined} Q Radial origin used for distances.
 *   The legacy response form supplies this as `curve_samples.Q`.
 * @returns {Array<{t:number,C:{re:number,im:number},value:number}>} Every
 *   interpolated sample with its distance-from-Q waveform value.
 */
export const build_waveform_profile = (curve_samples, Q) => {
  // Compatibility: callers using the original response-shaped argument can
  // continue during the pipeline refactor. New callers should pass samples
  // and Q separately so waveform construction has no page or HTTP coupling.
  const legacy_response = !Array.isArray(curve_samples) ? curve_samples : null;
  const origin = Q || legacy_response?.Q;
  const samples = Array.isArray(curve_samples)
    ? curve_samples
    : legacy_response?.result || [];
  if (!origin || samples.length === 0) {
    return [];
  }
  return samples.map(({ t, C }) => ({
    t,
    C: { re: C.re, im: C.im },
    value: Math.hypot(C.re - origin.re, C.im - origin.im),
  }));
};

/**
 * Remove DC offset and normalize a waveform profile for audio playback.
 * The original distance value remains available as `value`; `audio_value`
 * is centered and scaled to the range [-1, 1].
 *
 * @param {Array<{t:number,C:{re:number,im:number},value:number}>} profile
 *   Complete unprocessed waveform profile.
 * @returns {Array<{t:number,C:{re:number,im:number},value:number,audio_value:number}>}
 *   Profile with audio-ready values.
 */
export const normalize_waveform_profile = (profile) => {
  if (profile.length === 0) {
    return [];
  }
  const mean =
    profile.reduce((sum, sample) => sum + sample.value, 0) / profile.length;
  const centered_values = profile.map((sample) => sample.value - mean);
  const peak = Math.max(...centered_values.map((value) => Math.abs(value)));
  return profile.map((sample, index) => ({
    ...sample,
    audio_value: peak > 0 ? centered_values[index] / peak : 0,
  }));
};

/**
 * Unwrap the angular parameter so it progresses continuously through the
 * complete circuit, including its closing sample.
 *
 * @param {Array<{t:number}>} profile Complete waveform profile.
 * @returns {Array<object>} Profile with a continuous `unwrapped_t` field.
 */
export const unwrap_waveform_profile = (profile) => {
  if (profile.length === 0) {
    return [];
  }
  let previous_t = profile[0].t;
  return profile.map((sample, index) => {
    if (index === 0) {
      return { ...sample, unwrapped_t: previous_t };
    }
    let unwrapped_t = sample.t;
    while (unwrapped_t - previous_t > Math.PI) {
      unwrapped_t -= FULL_TURN;
    }
    while (unwrapped_t - previous_t < -Math.PI) {
      unwrapped_t += FULL_TURN;
    }
    previous_t = unwrapped_t;
    return { ...sample, unwrapped_t };
  });
};

/**
 * Create a periodic interpolator for an audio-ready waveform profile.
 * The final profile sample closes the circuit and is not treated as a second
 * independent cycle boundary.
 *
 * @param {Array<{unwrapped_t:number,audio_value:number}>} profile Complete
 *   profile with continuous parameter values and normalized amplitudes.
 * @returns {(unwrapped_t:number) => number} Interpolated waveform function.
 */
export const create_periodic_waveform_interpolator = (profile) => {
  if (profile.length === 0) {
    return () => 0;
  }
  if (profile.length === 1) {
    return () => profile[0].audio_value;
  }
  const start_t = profile[0].unwrapped_t;
  const end_t = profile[profile.length - 1].unwrapped_t;
  const period = end_t - start_t;
  const cycle_length = profile.length - 1;
  if (!Number.isFinite(period) || period <= 0) {
    return () => profile[0].audio_value;
  }
  return (requested_t) => {
    if (!Number.isFinite(requested_t)) {
      return profile[0].audio_value;
    }
    const offset =
      ((requested_t - start_t) % period + period) % period;
    const t = start_t + offset;
    let upper_index = 1;
    while (
      upper_index < profile.length - 1 &&
      profile[upper_index].unwrapped_t < t
    ) {
      upper_index += 1;
    }
    const lower = profile[upper_index - 1];
    const upper = profile[upper_index];
    const span = upper.unwrapped_t - lower.unwrapped_t;
    if (!Number.isFinite(span) || span <= 0) {
      return lower.audio_value;
    }
    const fraction = (t - lower.unwrapped_t) / span;
    const lower_index = upper_index - 1;
    const point_before =
      profile[(lower_index - 1 + cycle_length) % cycle_length];
    const point_after = profile[(upper_index + 1) % cycle_length];
    const fraction_squared = fraction * fraction;
    const fraction_cubed = fraction_squared * fraction;
    const interpolated_value =
      0.5 *
      ((2 * lower.audio_value +
        (-point_before.audio_value + upper.audio_value) * fraction +
        (2 * point_before.audio_value -
          5 * lower.audio_value +
          4 * upper.audio_value -
          point_after.audio_value) *
          fraction_squared +
        (-point_before.audio_value +
          3 * lower.audio_value -
          3 * upper.audio_value +
          point_after.audio_value) *
          fraction_cubed));
    return Math.max(-1, Math.min(1, interpolated_value));
  };
};

/**
 * Measure continuity at the periodic waveform boundary.
 *
 * @param {Array<{unwrapped_t:number,audio_value:number}>} profile Complete
 *   waveform profile with a closing sample.
 * @returns {{value_gap:number,slope_gap:number,continuous:boolean}} Boundary
 *   continuity diagnostics.
 */
export const validate_waveform_continuity = (profile) => {
  if (profile.length < 2) {
    return {
      value_gap: 0,
      slope_gap: 0,
      continuous: profile.length === 1,
    };
  }
  const first = profile[0];
  const second = profile[1];
  const penultimate = profile[profile.length - 2];
  const last = profile[profile.length - 1];
  const first_span = second.unwrapped_t - first.unwrapped_t;
  const last_span = last.unwrapped_t - penultimate.unwrapped_t;
  const first_slope =
    first_span > 0
      ? (second.audio_value - first.audio_value) / first_span
      : 0;
  const last_slope =
    last_span > 0
      ? (last.audio_value - penultimate.audio_value) / last_span
      : 0;
  const value_gap = Math.abs(last.audio_value - first.audio_value);
  const slope_gap = Math.abs(last_slope - first_slope);
  return {
    value_gap,
    slope_gap,
    continuous: value_gap <= 1e-6,
  };
};

/**
 * Create a continuous phase accumulator for waveform playback.
 * A fractional cycle is retained between calls, so neither audio buffers nor
 * animation frames need to contain an integral number of tone cycles.
 *
 * @param {number} frequency_hz Tone frequency in hertz.
 * @param {number} sample_rate_hz Audio sample rate in hertz.
 * @param {number} [initial_phase=0] Initial phase in cycles.
 * @returns {{next_phase: function(): number, get_phase: function(): number,
 *   reset: function(number=): void, phase_increment: number}}
 *   Phase state and per-sample increment.
 */
export const create_phase_accumulator = (
  frequency_hz,
  sample_rate_hz,
  initial_phase = 0,
) => {
  const frequency = Number(frequency_hz);
  const sample_rate = Number(sample_rate_hz);
  const phase_increment =
    Number.isFinite(frequency) &&
    Number.isFinite(sample_rate) &&
    sample_rate > 0
      ? frequency / sample_rate
      : 0;
  let phase = Number.isFinite(Number(initial_phase))
    ? ((Number(initial_phase) % 1) + 1) % 1
    : 0;
  const next_phase = () => {
    const current_phase = phase;
    phase = ((phase + phase_increment) % 1 + 1) % 1;
    return current_phase;
  };
  const get_phase = () => phase;
  const reset = (next_phase_value = 0) => {
    const numeric_phase = Number(next_phase_value);
    phase = Number.isFinite(numeric_phase)
      ? ((numeric_phase % 1) + 1) % 1
      : 0;
  };
  return { next_phase, get_phase, reset, phase_increment };
};

/**
 * Render a block of waveform samples from a continuous phase state.
 * Successive calls with the same accumulator continue exactly where the
 * previous block ended, regardless of block or animation-frame boundaries.
 *
 * @param {Array<{unwrapped_t:number,audio_value:number}>} profile Normalized
 *   periodic waveform profile.
 * @param {{next_phase:function():number}} phase_accumulator Tone phase state.
 * @param {number} sample_count Number of samples to render.
 * @returns {Float32Array} Audio samples in the normalized [-1, 1] range.
 */
export const render_waveform_samples = (
  profile,
  phase_accumulator,
  sample_count,
) => {
  const count = Math.max(0, Math.floor(Number(sample_count) || 0));
  const output = new Float32Array(count);
  if (count === 0 || profile.length === 0 || !phase_accumulator?.next_phase) {
    return output;
  }
  const interpolate = create_periodic_waveform_interpolator(profile);
  const start_t = profile[0].unwrapped_t;
  const period = profile[profile.length - 1].unwrapped_t - start_t;
  if (!Number.isFinite(period) || period <= 0) {
    return output;
  }
  for (let index = 0; index < count; index += 1) {
    const phase = phase_accumulator.next_phase();
    output[index] = interpolate(start_t + phase * period);
  }
  return output;
};

/**
 * Create a scheduler that distributes audio samples across animation frames.
 * Fractional samples are carried forward instead of being rounded away, so
 * long-running animation remains synchronized with the audio clock.
 *
 * @param {number} sample_rate_hz Audio sample rate in hertz.
 * @param {number} frame_rate_hz Animation frame rate in hertz.
 * @returns {{next_sample_count:function():number, samples_per_frame:number}}
 *   Frame sample-count scheduler.
 */
export const create_frame_sample_scheduler = (
  sample_rate_hz,
  frame_rate_hz,
) => {
  const sample_rate = Number(sample_rate_hz);
  const frame_rate = Number(frame_rate_hz);
  const samples_per_frame =
    Number.isFinite(sample_rate) &&
    sample_rate > 0 &&
    Number.isFinite(frame_rate) &&
    frame_rate > 0
      ? sample_rate / frame_rate
      : 0;
  let pending_samples = 0;
  const next_sample_count = () => {
    pending_samples += samples_per_frame;
    const sample_count = Math.floor(pending_samples);
    pending_samples -= sample_count;
    return sample_count;
  };
  return { next_sample_count, samples_per_frame };
};

/**
 * Render the next animation-frame audio block.
 *
 * @param {Array} profile Normalized periodic waveform profile.
 * @param {{next_phase:function():number}} phase_accumulator Persistent tone
 *   phase state.
 * @param {{next_sample_count:function():number}} frame_scheduler Frame sample
 *   scheduler created by `create_frame_sample_scheduler`.
 * @returns {Float32Array} Samples for the next animation frame.
 */
export const render_waveform_frame = (
  profile,
  phase_accumulator,
  frame_scheduler,
) =>
  render_waveform_samples(
    profile,
    phase_accumulator,
    frame_scheduler?.next_sample_count?.() || 0,
  );

/**
 * Copy normalized mono samples into a Web Audio buffer.
 *
 * @param {BaseAudioContext|null} audio_context Browser audio context used to
 *   allocate the buffer.
 * @param {Float32Array|Array<number>} samples Normalized mono samples.
 * @returns {AudioBuffer|null} Audio buffer, or null when inputs are invalid.
 */
export const create_mono_audio_buffer = (audio_context, samples) => {
  if (!audio_context?.createBuffer || !samples) {
    return null;
  }
  const sample_array =
    samples instanceof Float32Array ? samples : Float32Array.from(samples);
  if (sample_array.length === 0) {
    return null;
  }
  const audio_buffer = audio_context.createBuffer(
    1,
    sample_array.length,
    audio_context.sampleRate,
  );
  audio_buffer.getChannelData(0).set(sample_array);
  return audio_buffer;
};
