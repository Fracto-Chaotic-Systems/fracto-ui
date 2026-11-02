export const DEFAULT_MIDI_MIX = Object.freeze({
  mute: false,
  solo: false,
  volume: 1,
  pan: 0,
});
export const midi_route_id = (note) =>
  `track:${note.track}:channel:${note.channel}`;
export const midi_mix_gain = (setting, any_solo) =>
  setting.mute || (any_solo && !setting.solo) ? 0 : setting.volume;

const freeze_mix = (mix) => Object.freeze(mix);
function normalized_patch(previous, patch) {
  const next = { ...previous };
  for (const key of ["mute", "solo"])
    if (typeof patch[key] === "boolean") next[key] = patch[key];
  for (const [key, min, max] of [
    ["volume", 0, 1],
    ["pan", -1, 1],
  ]) {
    if (typeof patch[key] === "number" && Number.isFinite(patch[key]))
      next[key] = Math.max(min, Math.min(max, patch[key]));
  }
  return Object.freeze(next);
}
const automate = (parameter, value, now, live) => {
  const current = parameter.value;
  if (parameter.cancelAndHoldAtTime) parameter.cancelAndHoldAtTime(now);
  else {
    parameter.cancelScheduledValues(now);
    parameter.setValueAtTime(current, now);
  }
  if (live) parameter.linearRampToValueAtTime(value, now + 0.012);
  else parameter.setValueAtTime(value, now);
};

// Settings belong to a loaded song; buses belong to a single playback run.
export default class MidiMixer {
  constructor() {
    this.mix = freeze_mix({});
    this.buses = new Map();
    this.context = null;
  }
  load(song) {
    this.disconnect();
    const mix = {};
    for (const note of song?.notes ?? [])
      mix[midi_route_id(note)] = DEFAULT_MIDI_MIX;
    this.mix = freeze_mix(mix);
    return this.mix;
  }
  update(id, patch) {
    if (!Object.hasOwn(this.mix, id) || !patch || typeof patch !== "object")
      return false;
    this.mix = freeze_mix({
      ...this.mix,
      [id]: normalized_patch(this.mix[id], patch),
    });
    this.apply(true);
    return true;
  }
  reset() {
    this.mix = freeze_mix(
      Object.fromEntries(
        Object.keys(this.mix).map((id) => [id, DEFAULT_MIDI_MIX]),
      ),
    );
    this.apply(true);
  }
  connect(context, destination) {
    this.disconnect();
    this.context = context;
    try {
      for (const id of Object.keys(this.mix)) {
        const bus = {};
        this.buses.set(id, bus);
        bus.gain = context.createGain();
        bus.pan = context.createStereoPanner();
        bus.gain.connect(bus.pan).connect(destination);
      }
      this.apply(false);
    } catch (error) {
      this.disconnect();
      throw error;
    }
  }
  apply(live) {
    if (!this.context) return;
    const solo = Object.values(this.mix).some((setting) => setting.solo);
    for (const [id, bus] of this.buses) {
      const setting = this.mix[id];
      automate(
        bus.gain.gain,
        midi_mix_gain(setting, solo),
        this.context.currentTime,
        live,
      );
      automate(bus.pan.pan, setting.pan, this.context.currentTime, live);
    }
  }
  destination(note) {
    const bus = this.buses.get(midi_route_id(note));
    if (!bus) throw new Error("No mixer route for MIDI note.");
    return bus.gain;
  }
  disconnect() {
    for (const bus of this.buses.values())
      for (const node of [bus.gain, bus.pan]) {
        try {
          node?.disconnect();
        } catch {
          /* Release every other route too. */
        }
      }
    this.buses.clear();
    this.context = null;
  }
}
