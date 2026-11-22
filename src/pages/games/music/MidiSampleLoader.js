import { MidiPlaybackError } from "@fracto/sdk/music/MidiPianoSamples.js";
import { decoded_asset_bytes, verify_asset_bytes } from "./MidiSampleAsset.js";
import { sample_memory_error } from "./MidiSampleBudget.js";

export const encoded_sample_limit = (sample) =>
  sample.encoded_bytes ?? 4 * 1024 * 1024;
export const sample_reservation = (sample, context) =>
  decoded_asset_bytes(sample, context) + 2 * encoded_sample_limit(sample);

async function bounded_bytes(response, maximum, check) {
  if (Number(response.headers?.get("content-length")) > maximum)
    throw sample_memory_error();
  if (!response.body?.getReader) {
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > maximum) throw sample_memory_error();
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      check();
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximum) throw sample_memory_error();
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes.buffer;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function load_cached_sample(
  cache,
  key,
  sample,
  context,
  signal,
  check,
) {
  const reservation = sample_reservation(sample, context);
  return cache.budget.run(reservation, signal, async (release) => {
    check();
    const response = await cache.fetch_sample(sample.url, {
      signal,
      credentials: sample.credentials ?? "omit",
    });
    check();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const encoded = await bounded_bytes(
      response,
      encoded_sample_limit(sample),
      check,
    );
    check();
    await verify_asset_bytes(sample, encoded, signal);
    check();
    const buffer = await context.decodeAudioData(encoded);
    check();
    if (
      !Number.isFinite(buffer.duration) ||
      buffer.duration <= 0 ||
      !Number.isSafeInteger(buffer.length) ||
      buffer.length <= 0 ||
      !Number.isSafeInteger(buffer.numberOfChannels) ||
      buffer.numberOfChannels <= 0
    )
      throw new MidiPlaybackError(
        "invalid_sample",
        "An instrument sample contains no usable audio.",
      );
    if (
      sample.asset_frames &&
      (buffer.numberOfChannels !== sample.asset_channels ||
        Math.abs(
          buffer.duration - sample.asset_frames / sample.asset_sample_rate,
        ) >
          2 /
            (buffer.sampleRate ||
              context.sampleRate ||
              sample.asset_sample_rate))
    )
      throw new MidiPlaybackError(
        "invalid_sample",
        "Decoded instrument audio differs from its catalog.",
      );
    const bytes = buffer.length * buffer.numberOfChannels * 4;
    const managed_bytes =
      cache.bytes +
      bytes +
      cache.budget.reserved -
      reservation +
      2 * encoded_sample_limit(sample);
    if (managed_bytes > cache.max_bytes) throw sample_memory_error();
    // Transfer ownership synchronously, without double-counting another job's
    // already-published buffer. Waiter microtasks run after resident bytes update.
    release();
    cache.buffers.set(key, buffer);
    cache.bytes += bytes;
    cache.budget.peak_bytes = Math.max(cache.budget.peak_bytes, managed_bytes);
    cache.peak_decoded_bytes = Math.max(cache.peak_decoded_bytes, cache.bytes);
    return buffer;
  });
}
