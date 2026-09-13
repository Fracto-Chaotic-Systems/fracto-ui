import test from "node:test";
import assert from "node:assert/strict";

import {
  build_waveform_profile,
  create_periodic_waveform_interpolator,
  create_frame_sample_scheduler,
  create_phase_accumulator,
  normalize_waveform_profile,
  render_waveform_samples,
  validate_waveform_continuity,
  unwrap_waveform_profile,
} from "../src/pages/study/circuitry/CircuitryAudioUtils.js";

const make_profile = () =>
  normalize_waveform_profile(
    unwrap_waveform_profile(
      build_waveform_profile({
        Q: { re: 0, im: 0 },
        result: [
          { t: 2.8, C: { re: 1, im: 0 } },
          { t: 3.4, C: { re: 0, im: 1 } },
          { t: 4.2, C: { re: -1, im: 0 } },
          { t: 5.0, C: { re: 0, im: -1 } },
          { t: 2.8, C: { re: 1, im: 0 } },
        ],
      }),
    ),
  );

test("waveform profile preserves every interpolated sample", () => {
  const profile = make_profile();
  assert.equal(profile.length, 5);
  assert.ok(profile.every((sample) => Number.isFinite(sample.audio_value)));
  assert.ok(profile.every((sample) => sample.audio_value >= -1));
  assert.ok(profile.every((sample) => sample.audio_value <= 1));
});

test("periodic interpolation is continuous at the loop boundary", () => {
  const profile = make_profile();
  const continuity = validate_waveform_continuity(profile);
  assert.equal(continuity.continuous, true);
  const interpolate = create_periodic_waveform_interpolator(profile);
  const start = profile[0].unwrapped_t;
  const period = profile.at(-1).unwrapped_t - start;
  assert.equal(interpolate(start), interpolate(start + period));
});

test("phase and frame scheduling remain continuous across blocks", () => {
  const profile = make_profile();
  for (const [frequency, sample_rate, frame_rate] of [
    [440, 48000, 20],
    [220, 44100, 30],
    [523.25, 48000, 24],
  ]) {
    for (const duration_seconds of [0.5, 1, 10]) {
      const accumulator = create_phase_accumulator(frequency, sample_rate);
      const scheduler = create_frame_sample_scheduler(
        sample_rate,
        frame_rate,
      );
      let rendered_samples = 0;
      const frame_count = Math.round(duration_seconds * frame_rate);
      for (let frame = 0; frame < frame_count; frame += 1) {
        const block = render_waveform_samples(
          profile,
          accumulator,
          scheduler.next_sample_count(),
        );
        rendered_samples += block.length;
      }
      assert.ok(
        Math.abs(rendered_samples - duration_seconds * sample_rate) <= 1,
      );
      assert.ok(accumulator.get_phase() >= 0);
      assert.ok(accumulator.get_phase() < 1);
    }
  }
});
