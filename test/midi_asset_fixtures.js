import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
export const catalog_url = "https://example.test/api/asset/instruments";
export function asset_fixture() {
  const frames = 98400,
    rate = 48000;
  const bytes = Buffer.alloc(44 + frames * 2);
  bytes.write("RIFF");
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(frames * 2, 40);
  const digest = createHash("sha256").update(bytes).digest("hex");
  const asset = {
    id: "flute-main-chunk-0",
    recording_id: "flute-main",
    velocity_layer: null,
    sha256: digest,
    available: true,
    url: `/instruments/flute/audio/flute-main-chunk-0?v=${digest}`,
    bytes: bytes.length,
    method_version: "mono-octave-pcm16-v1",
    encoding: "pcm_s16le",
    mime_type: "audio/wav",
    channels: 1,
    sample_rate: rate,
    frames,
    duration_seconds: frames / rate,
    decoded_bytes_at_48000: frames * 4,
    notes: [
      {
        midi_pitch: 60,
        offset_frames: 0,
        frames: 48000,
        onset_frame: 960,
        offset_seconds: 0,
        duration_seconds: 1,
        tail_guarded: false,
      },
      {
        midi_pitch: 61,
        offset_frames: 50400,
        frames: 48000,
        onset_frame: 51360,
        offset_seconds: 1.05,
        duration_seconds: 1,
        tail_guarded: false,
      },
    ],
  };
  const catalog = {
    schema_version: 1,
    library_version: 3,
    revision: "a".repeat(64),
    browser_verification: "pending",
    instruments: [
      {
        id: "flute",
        name: "Flute",
        enabled: true,
        available: true,
        verification_status: "assets_prepared",
        midi_programs: [],
        banks: [],
        recordings: [{ id: "flute-main", velocity_layer: null }],
        playback_assets: [asset],
      },
    ],
  };
  const buffer = {
    sampleRate: rate,
    numberOfChannels: 1,
    length: frames,
    duration: frames / rate,
  };
  const response = () => ({
    ok: true,
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
  return { catalog, asset, bytes, buffer, response };
}
