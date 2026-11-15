import { verify_asset_bytes } from "../src/pages/games/music/MidiSampleAsset.js";
import { integrity_wav } from "./midi_integrity_fixture.js";

const button = document.getElementById("run"),
  output = document.getElementById("result");
button.addEventListener("click", async () => {
  button.disabled = true;
  output.textContent = "Verifying…";
  let context;
  try {
    const bytes = integrity_wav();
    const sample = {
      encoded_bytes: bytes.byteLength,
      sha256:
        "62067147f1f0e154b75c0a57cbadd0adbc2a45cbc3ccfab7bc6c1513c9286ba7",
    };
    await verify_asset_bytes(sample, bytes);
    context = new AudioContext();
    const decoded = await context.decodeAudioData(bytes.slice(0));
    if (decoded.length < 1 || decoded.numberOfChannels !== 1)
      throw Error("Native WAV decode failed");
    const corrupt = bytes.slice(0);
    new Uint8Array(corrupt)[70] ^= 1;
    let corrupt_rejected = false;
    try {
      await verify_asset_bytes(sample, corrupt);
    } catch (error) {
      corrupt_rejected = error.code === "invalid_sample";
    }
    if (!corrupt_rejected) throw Error("Corrupt sample was accepted");
    output.textContent = JSON.stringify(
      {
        result: "passed",
        origin: location.origin,
        secure_context: isSecureContext,
        web_crypto_available: !!globalThis.crypto?.subtle,
        encoded_bytes: bytes.byteLength,
        verified_sha256: sample.sha256,
        decoded_frames: decoded.length,
        corrupt_rejected,
      },
      null,
      2,
    );
  } catch (error) {
    output.textContent = JSON.stringify({
      result: "failed",
      message: error.message,
    });
  } finally {
    await context?.close();
    button.disabled = false;
  }
});
