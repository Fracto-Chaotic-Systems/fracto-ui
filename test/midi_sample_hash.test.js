import test from "node:test";
import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { sample_sha256 } from "../src/pages/games/music/MidiSampleHash.js";
import { verify_asset_bytes } from "../src/pages/games/music/MidiSampleAsset.js";
import MidiSampleCache from "../src/pages/games/music/MidiSampleCache.js";
import { registry_from_catalog } from "../src/pages/games/music/MidiInstrumentCatalog.js";
import { asset_fixture, catalog_url } from "./midi_asset_fixtures.js";
import { FakeContext, note } from "./midi_audio_fakes.js";

async function with_crypto(value, operation) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", { configurable: true, value });
  try {
    return await operation();
  } finally {
    if (original) Object.defineProperty(globalThis, "crypto", original);
    else delete globalThis.crypto;
  }
}
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("HTTP fallback matches SHA-256 vectors, padding boundaries and multiple chunks", async () => {
  await with_crypto({}, async () => {
    assert.equal(
      await sample_sha256(new Uint8Array()),
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    assert.equal(
      await sample_sha256(new TextEncoder().encode("abc")),
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    for (const size of [55, 56, 63, 64, 65, 1024 * 1024 * 2 + 37]) {
      const bytes = Uint8Array.from({ length: size }, (_, i) => (i * 31) & 255);
      assert.equal(await sample_sha256(bytes), digest(bytes));
    }
    const view = new Uint8Array([255, 1, 2, 3, 255]).subarray(1, 4);
    assert.equal(await sample_sha256(view), digest(view));
  });
  await with_crypto(undefined, async () =>
    assert.equal(
      await sample_sha256(new Uint8Array([1])),
      digest(new Uint8Array([1])),
    ),
  );
});

test("HTTPS/localhost retains the native digest path and surfaces native failures", async () => {
  let calls = 0;
  await with_crypto(
    {
      subtle: {
        digest: (...args) => {
          calls++;
          return webcrypto.subtle.digest(...args);
        },
      },
    },
    async () => {
      const bytes = new Uint8Array([1, 2, 3]);
      assert.equal(await sample_sha256(bytes), digest(bytes));
    },
  );
  assert.equal(calls, 1);
  await with_crypto(
    {
      subtle: {
        digest: async () => {
          throw Error("unavailable");
        },
      },
    },
    async () => {
      await assert.rejects(
        verify_asset_bytes(
          { sha256: digest(new Uint8Array([1])), encoded_bytes: 1 },
          new Uint8Array([1]),
        ),
        { code: "sample_integrity_unavailable" },
      );
    },
  );
});

test("fallback yields to cancellation between chunks", async () => {
  await with_crypto({}, async () => {
    const abort = new AbortController();
    const promise = sample_sha256(
      new Uint8Array(4 * 1024 * 1024),
      abort.signal,
    );
    abort.abort();
    await assert.rejects(promise, { code: "cancelled" });
    await assert.rejects(sample_sha256(new Uint8Array([1]), abort.signal), {
      code: "cancelled",
    });
  });
});

test("HTTP sample cache verifies valid assets and rejects corrupt/short bodies before decode", async () => {
  await with_crypto({}, async () => {
    const f = asset_fixture();
    const registry = registry_from_catalog(f.catalog, catalog_url);
    const options = {
      registry,
      assignments: { "track:0:channel:0": "asset-flute" },
    };
    const notes = [{ ...note(), track: 0 }];
    const context = new FakeContext();
    context.buffer = f.buffer;
    context.sampleRate = 48000;
    const cache = new MidiSampleCache({
      fetch_sample: async () => f.response(),
    });
    await cache.prepare(notes, context, new AbortController().signal, options);
    assert.equal(context.decoded, 1);
    assert.equal(cache.buffers.size, 1);
    for (const short of [false, true]) {
      const bytes = new Uint8Array(f.bytes);
      if (!short) bytes[70] ^= 1;
      const body = short ? bytes.subarray(0, bytes.length - 1) : bytes;
      const decoder = new FakeContext();
      decoder.buffer = f.buffer;
      const bad = new MidiSampleCache({
        fetch_sample: async () => ({
          ok: true,
          arrayBuffer: async () =>
            body.buffer.slice(
              body.byteOffset,
              body.byteOffset + body.byteLength,
            ),
        }),
      });
      await assert.rejects(
        bad.prepare(notes, decoder, new AbortController().signal, options),
        { code: "invalid_sample" },
      );
      assert.equal(decoder.decoded, 0);
      assert.equal(bad.buffers.size, 0);
    }
  });
});
