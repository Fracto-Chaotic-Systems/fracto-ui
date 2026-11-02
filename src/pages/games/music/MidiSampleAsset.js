import { MidiPlaybackError } from "./MidiPianoSamples.js";

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
  if (!sample.asset_frames) return 0;
  return (
    Math.ceil(
      (sample.asset_frames * (context.sampleRate || sample.asset_sample_rate)) /
        sample.asset_sample_rate,
    ) *
    sample.asset_channels *
    4
  );
}

export async function verify_asset_bytes(sample, bytes) {
  if (!sample.sha256) return;
  if (bytes.byteLength !== sample.encoded_bytes)
    throw new MidiPlaybackError(
      "invalid_sample",
      "Instrument audio size differs from its catalog.",
    );
  if (!globalThis.crypto?.subtle)
    throw new MidiPlaybackError(
      "sample_integrity_unavailable",
      "Instrument audio verification requires HTTPS or localhost.",
    );
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const actual = [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  if (actual !== sample.sha256)
    throw new MidiPlaybackError(
      "invalid_sample",
      "Instrument audio checksum differs from its catalog.",
    );
}
