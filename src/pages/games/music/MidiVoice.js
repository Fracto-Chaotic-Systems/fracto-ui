import { sample_window } from "./MidiSampleAsset.js";
// Every note owns a separate source, envelope and pan node. Never reuse a
// voice by pitch: repeated/sustained notes must be able to overlap.
export function schedule_midi_voice(
  context,
  destination,
  note,
  sample,
  origin,
  on_ended,
) {
  const nominal_start = origin + note.start_seconds;
  const start = Math.max(nominal_start, context.currentTime);
  const window = sample_window(sample);
  const late = start - nominal_start;
  const offset = window.offset + late;
  const one_shot = sample.playback_mode === "one-shot";
  const release = one_shot
    ? nominal_start + window.duration
    : origin + note.end_seconds;
  // A delayed scheduler skips finished notes rather than replaying a burst.
  if (release <= start || late >= window.duration) return null;
  let stop = Math.min(
    release + sample.release_seconds,
    nominal_start + window.duration,
  );
  const source = context.createBufferSource();
  const gain = context.createGain();
  const pan = context.createStereoPanner();
  let cleaned = false;
  let choke_at = Infinity;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    source.onended = null;
    source.disconnect();
    gain.disconnect();
    pan.disconnect();
    on_ended(voice);
  };
  const voice = {
    choke(when) {
      if (cleaned) return;
      const time = Math.max(start, context.currentTime, when);
      // A rapid roll must not reset an already-fading hit to full gain.
      if (time >= stop || time >= choke_at) return;
      choke_at = time;
      stop = Math.min(stop, time + 0.005);
      gain.gain.cancelScheduledValues(time);
      gain.gain.setValueAtTime(sample.gain, time);
      gain.gain.linearRampToValueAtTime(0, stop);
      source.stop(stop);
    },
    stop() {
      if (cleaned) return;
      source.onended = null;
      try {
        source.stop();
      } finally {
        cleanup();
      }
    },
  };
  try {
    source.buffer = sample.buffer;
    source.connect(gain);
    gain.connect(pan);
    pan.connect(destination);
    pan.pan.setValueAtTime(sample.pan, start);
    gain.gain.setValueAtTime(one_shot ? sample.gain : 0, start);
    if (!one_shot)
      gain.gain.linearRampToValueAtTime(
        sample.gain,
        Math.min(start + 0.005, release),
      );
    if (release < stop) {
      gain.gain.setValueAtTime(sample.gain, release);
      gain.gain.linearRampToValueAtTime(0, stop);
    }
    source.onended = cleanup;
    source.start(start, offset, stop - start);
    source.stop(stop);
    return voice;
  } catch (error) {
    // A failure after start must not leave a connected, audible source.
    try {
      voice.stop();
    } catch {
      cleanup();
    }
    throw error;
  }
}
