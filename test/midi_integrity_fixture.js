// Browser-only test data. No files are fetched or sent to an instrument service.
export function integrity_wav() {
  const frames = 1024 * 1024,
    rate = 48000;
  const bytes = new ArrayBuffer(44 + frames * 2),
    view = new DataView(bytes);
  const text = (offset, value) =>
    new Uint8Array(bytes).set(new TextEncoder().encode(value), offset);
  text(0, "RIFF");
  view.setUint32(4, bytes.byteLength - 8, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, frames * 2, true);
  const pattern = [0, 8192, 0, -8192];
  for (let frame = 0; frame < frames; frame++)
    view.setInt16(44 + frame * 2, pattern[frame % 4], true);
  return bytes;
}
