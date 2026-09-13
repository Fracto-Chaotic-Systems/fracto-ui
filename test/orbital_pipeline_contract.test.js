import test from "node:test";
import assert from "node:assert/strict";

import {
  build_waveform_profile,
  normalize_waveform_profile,
  unwrap_waveform_profile,
} from "../src/pages/study/circuitry/CircuitryAudioUtils.js";

/**
 * Verify the cross-stage boundary: a radial-sweep-shaped curve sample list
 * can enter waveform construction directly, without a circuitry response
 * wrapper or any detector/Newton metadata.
 */
test("curve contract flows directly into waveform construction", () => {
  const curve_samples = [
    { t: 0, C: { re: 1, im: 0 } },
    { t: Math.PI / 2, C: { re: 0, im: 1 } },
    { t: Math.PI, C: { re: -1, im: 0 } },
    { t: (3 * Math.PI) / 2, C: { re: 0, im: -1 } },
    { t: 2 * Math.PI, C: { re: 1, im: 0 } },
  ];
  const profile = normalize_waveform_profile(
    unwrap_waveform_profile(
      build_waveform_profile(curve_samples, { re: 0, im: 0 }),
    ),
  );
  assert.equal(profile.length, curve_samples.length);
  assert.ok(profile.every((sample) => Number.isFinite(sample.value)));
  assert.ok(profile.every((sample) => Number.isFinite(sample.audio_value)));
  assert.equal(profile[0].value, 1);
  assert.equal(profile.at(-1).value, 1);
});
