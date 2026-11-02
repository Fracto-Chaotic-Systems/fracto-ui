import { MidiPlaybackError } from "./MidiPianoSamples.js";

// Abort and timeout must settle even if a fetch/decoder/resume ignores cancellation.
export function loading_task(operation, signal, timeout_ms, timeout_code) {
  return new Promise((resolve, reject) => {
    let timer;
    const finish = (callback, value) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      callback(value);
    };
    const abort = () =>
      finish(
        reject,
        new MidiPlaybackError("cancelled", "MIDI loading was cancelled."),
      );
    if (signal.aborted) return abort();
    signal.addEventListener("abort", abort, { once: true });
    timer = setTimeout(
      () =>
        finish(
          reject,
          new MidiPlaybackError(
            timeout_code,
            "MIDI audio preparation timed out.",
          ),
        ),
      timeout_ms,
    );
    try {
      Promise.resolve(operation()).then(
        (value) => finish(resolve, value),
        (error) => finish(reject, error),
      );
    } catch (error) {
      finish(reject, error);
    }
  });
}
