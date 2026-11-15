import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { MidiPlaybackError } from "./MidiPianoSamples.js";

const CHUNK_BYTES = 1024 * 1024;
const check = (signal) => {
  if (signal?.aborted)
    throw new MidiPlaybackError(
      "cancelled",
      "MIDI sample verification was cancelled.",
    );
};

// Web Crypto is absent on LAN HTTP origins. The bundled implementation still
// verifies every byte there; yielding between chunks keeps cancellation responsive.
export async function sample_sha256(bytes, signal) {
  check(signal);
  if (typeof globalThis.crypto?.subtle?.digest === "function") {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    check(signal);
    return bytesToHex(new Uint8Array(digest));
  }
  const input = ArrayBuffer.isView(bytes)
    ? new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    : new Uint8Array(bytes);
  const hash = sha256.create();
  try {
    for (let offset = 0; offset < input.length; offset += CHUNK_BYTES) {
      check(signal);
      hash.update(input.subarray(offset, offset + CHUNK_BYTES));
      if (offset + CHUNK_BYTES < input.length)
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
    check(signal);
    return bytesToHex(hash.digest());
  } finally {
    hash.destroy();
  }
}
