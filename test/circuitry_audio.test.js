import test from "node:test";
import assert from "node:assert/strict";

import {
  build_waveform_profile,
  build_chart_waveform_profile,
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
      build_waveform_profile(
        [
          { t: 2.8, C: { re: 1, im: 0 } },
          { t: 3.4, C: { re: 0, im: 1 } },
          { t: 4.2, C: { re: -1, im: 0 } },
          { t: 5.0, C: { re: 0, im: -1 } },
          { t: 2.8, C: { re: 1, im: 0 } },
        ],
        { re: 0, im: 0 },
      ),
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
  assert.equal(interpolate(0), interpolate(1));
});

test("audio visits the chart vertices at equal times and linearly matches the visible segments", () => {
  const curve = Array.from({ length: 101 }, (_, index) => ({
    t: index === 100 ? 0 : 2 * Math.PI * (index / 100) ** 3,
    C: { re: 2 + Math.cos((2 * Math.PI * index) / 100), im: 0 },
  }));
  const chart = build_chart_waveform_profile(curve, { re: 0, im: 0 }, 2);
  const audio = normalize_waveform_profile(chart);
  assert.equal(chart.length, 21);
  for (let index = 0; index < chart.length; index++) {
    assert.equal(chart[index].value, Math.abs(curve[index * 5].C.re));
    assert.equal(chart[index].phase, index / 20);
  }
  const interpolate = create_periodic_waveform_interpolator(audio);
  for (let index = 0; index < 20; index++) {
    assert.ok(
      Math.abs(interpolate(index / 20) - audio[index].audio_value) < 1e-12,
    );
    assert.ok(
      Math.abs(
        interpolate((index + 0.5) / 20) -
          (audio[index].audio_value + audio[index + 1].audio_value) / 2,
      ) < 1e-12,
    );
  }
  const samples = render_waveform_samples(
    audio,
    create_phase_accumulator(1, 40),
    40,
  );
  for (let index = 0; index < samples.length; index++) {
    const lower = Math.floor(index / 2);
    const expected =
      index % 2
        ? (audio[lower].audio_value + audio[lower + 1].audio_value) / 2
        : audio[lower].audio_value;
    assert.ok(Math.abs(samples[index] - expected) < 1e-6);
  }
});

test("uneven and clockwise sweep angles cannot warp or mute the chart-matched audio", () => {
  const values = [1, 2, 3, 1];
  const render = (angles) => {
    const curve = values.map((value, index) => ({
      t: angles[index],
      C: { re: value, im: 0 },
    }));
    const profile = normalize_waveform_profile(
      build_chart_waveform_profile(curve, { re: 0, im: 0 }, 3),
    );
    return render_waveform_samples(
      profile,
      create_phase_accumulator(110, 48000),
      1000,
    );
  };
  const uniform = render([0, 1, 2, 3]);
  assert.deepEqual(render([0, 0.001, 5.9, 0]), uniform);
  assert.deepEqual(render([2.8, 2.79, -2.5, 2.8]), uniform);
  assert.ok(uniform.some((sample) => Math.abs(sample) > 0.1));
});

test("normalization preserves the chart shape and does not amplify a flat curve's roundoff into a buzz", () => {
  const flat = normalize_waveform_profile([
    { value: 1 },
    { value: 1 + Number.EPSILON },
    { value: 1 },
  ]);
  assert.ok(flat.every((sample) => sample.audio_value === 0));
  const tiny = normalize_waveform_profile([
    { value: 1e-20 },
    { value: 2e-20 },
    { value: 1e-20 },
  ]);
  assert.ok(tiny.some((sample) => Math.abs(sample.audio_value) > 0.5));
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
      const scheduler = create_frame_sample_scheduler(sample_rate, frame_rate);
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
