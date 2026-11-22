import { MidiPlaybackError } from "@fracto/sdk/music/MidiPianoSamples.js";
import { sample_sha256 } from "./MidiSampleHash.js";

export function sample_window(sample, buffer = sample.buffer) {
  const offset = sample.offset_seconds ?? 0;
  const duration = sample.duration_seconds ?? buffer.duration - offset;
  const tolerance = buffer.sampleRate ? 1 / buffer.sampleRate : 1e-6;
  if (
    !Number.isFinite(offset) ||
    offset < 0 ||
    offset >= buffer.duration ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    offset + duration > buffer.duration + tolerance
  )
    throw new MidiPlaybackError(
      "invalid_sample",
      "The instrument note window exceeds its decoded audio.",
    );
  return { offset, duration: Math.min(duration, buffer.duration - offset) };
}

export function decoded_asset_bytes(sample, context) {
  if (!sample.asset_frames)
    return (
      Math.ceil(
        (sample.estimated_duration_seconds ?? 10.1) *
          (context.sampleRate || 48000),
      ) *
      (sample.estimated_channels ?? 1) *
      4
    );
  return (
    Math.ceil(
      (sample.asset_frames * (context.sampleRate || sample.asset_sample_rate)) /
        sample.asset_sample_rate,
    ) *
    sample.asset_channels *
    4
  );
}

export async function verify_asset_bytes(sample, bytes, signal) {
  if (!sample.sha256) return;
  if (bytes.byteLength !== sample.encoded_bytes)
    throw new MidiPlaybackError(
      "invalid_sample",
      "Instrument audio size differs from its catalog.",
    );
  let actual;
  try {
    actual = await sample_sha256(bytes, signal);
  } catch (error) {
    if (error instanceof MidiPlaybackError) throw error;
    throw new MidiPlaybackError(
      "sample_integrity_unavailable",
      "Instrument audio checksum verification failed. Retry playback.",
    );
  }
  if (actual !== sample.sha256)
    throw new MidiPlaybackError(
      "invalid_sample",
      "Instrument audio checksum differs from its catalog.",
    );
}
