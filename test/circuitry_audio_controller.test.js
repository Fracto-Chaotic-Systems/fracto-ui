import test from "node:test";
import assert from "node:assert/strict";

import {
  AUDIO_TRANSITIONS,
  AUDIO_TRANSITION_CROSSFADE,
  CircuitryAudioController,
  load_playback_volume,
} from "../src/pages/study/circuitry/CircuitryAudioController.js";

class FakeAudioParam {
  value = 1;
  setValueAtTime(value) {
    this.value = value;
  }
  setValueCurveAtTime() {}
  cancelScheduledValues() {}
  cancelAndHoldAtTime() {}
  linearRampToValueAtTime(value) {
    this.value = value;
  }
}

class FakeGainNode {
  gain = new FakeAudioParam();
  connected_to = null;
  connect(destination) {
    this.connected_to = destination;
  }
  disconnect() {
    this.connected_to = null;
  }
}

class FakeBufferSource {
  buffer = null;
  connected_to = null;
  started = false;
  stopped_at = null;
  onended = null;
  connect(destination) {
    this.connected_to = destination;
  }
  disconnect() {
    this.connected_to = null;
  }
  start() {
    this.started = true;
  }
  stop(when) {
    this.stopped_at = when ?? 0;
  }
}

class FakeAudioContext {
  sampleRate = 48000;
  currentTime = 10;
  state = "running";
  destination = {};
  sources = [];
  async resume() {}
  async close() {
    this.state = "closed";
  }
  createBuffer(channel_count, sample_count, sample_rate) {
    assert.equal(channel_count, 1);
    assert.equal(sample_rate, this.sampleRate);
    return {
      getChannelData: () => new Float32Array(sample_count),
    };
  }
  createBufferSource() {
    const source = new FakeBufferSource();
    this.sources.push(source);
    return source;
  }
  createGain() {
    return new FakeGainNode();
  }
}

const profile = [
  { unwrapped_t: 0, audio_value: 0 },
  { unwrapped_t: 1, audio_value: 1 },
  { unwrapped_t: 2, audio_value: 0 },
];

test("crossfade overlaps sources and preserves the replacement owner", async () => {
  assert.deepEqual(AUDIO_TRANSITIONS, {
    REPLACE: "replace",
    CROSSFADE: "crossfade",
  });
  globalThis.window = { AudioContext: FakeAudioContext };
  const playing_states = [];
  const controller = new CircuitryAudioController({
    on_playing_changed: (playing) => playing_states.push(playing),
  });

  assert.equal(await controller.play(profile), true);
  const old_source = controller.audio_source;
  assert.equal(old_source.started, true);

  assert.equal(
    await controller.play(profile, {
      transition: AUDIO_TRANSITION_CROSSFADE,
      fade_seconds: 0.12,
    }),
    true,
  );
  const new_source = controller.audio_source;
  assert.notEqual(new_source, old_source);
  assert.equal(new_source.started, true);
  assert.equal(old_source.stopped_at, 10.12);

  old_source.onended();
  assert.equal(controller.audio_source, new_source);
  assert.equal(playing_states.at(-1), true);

  controller.stop(true);
  assert.equal(controller.audio_source, null);
  assert.equal(playing_states.at(-1), false);
  controller.dispose();
  delete globalThis.window;
});

test("stop invalidates a play request waiting for resume", async () => {
  let resume_audio;
  class DelayedAudioContext extends FakeAudioContext {
    resume() {
      return new Promise((resolve) => {
        resume_audio = resolve;
      });
    }
  }
  globalThis.window = { AudioContext: DelayedAudioContext };
  const controller = new CircuitryAudioController();
  const pending_play = controller.play(profile);
  controller.stop(true);
  resume_audio();
  assert.equal(await pending_play, false);
  assert.equal(controller.audio_source, null);
  controller.dispose();
  delete globalThis.window;
});

test("volume defaults to 15 percent and adjusts active and future playback", async () => {
  globalThis.window = { AudioContext: FakeAudioContext };
  const controller = new CircuitryAudioController();
  try {
    await controller.play(profile);
    const master_gain = controller.master_gain;
    assert.equal(master_gain.gain.value, 0.15);
    assert.equal(controller.audio_gain.connected_to, master_gain);
    assert.equal(master_gain.connected_to, controller.audio_context.destination);
    const source = controller.audio_source;
    controller.set_volume(0.12);
    assert.equal(master_gain.gain.value, 0.12);
    assert.equal(controller.audio_source, source);
    controller.set_volume(0);
    assert.equal(master_gain.gain.value, 0.05);
    await controller.play(profile, { transition: AUDIO_TRANSITION_CROSSFADE });
    assert.equal(controller.audio_gain.connected_to, master_gain);
    assert.equal(master_gain.gain.value, 0.05);
    controller.set_volume(2);
    assert.equal(master_gain.gain.value, 0.2);
    controller.set_volume(-1);
    assert.equal(master_gain.gain.value, 0.05);
    controller.set_volume(NaN);
    assert.equal(master_gain.gain.value, 0.05);
  } finally {
    controller.dispose();
    delete globalThis.window;
  }
});

test("volume survives controller recreation and safely handles missing or invalid storage", () => {
  const saved = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => saved.get(key) ?? null,
      setItem: (key, value) => saved.set(key, value),
    },
  };
  try {
    assert.equal(load_playback_volume(), 0.15);
    const controller = new CircuitryAudioController();
    controller.set_volume(0.09);
    controller.dispose();
    const restored = new CircuitryAudioController();
    assert.equal(restored.volume, 0.09);
    restored.dispose();
    const key = [...saved.keys()][0];
    for (const value of ["", " ", "invalid", "Infinity"]) {
      saved.set(key, value);
      assert.equal(load_playback_volume(), 0.15);
    }
    saved.set(key, "0.9");
    assert.equal(load_playback_volume(), 0.2);
    saved.set(key, "0");
    assert.equal(load_playback_volume(), 0.05);
    window.localStorage.getItem = () => { throw new Error("Storage blocked"); };
    window.localStorage.setItem = () => { throw new Error("Storage blocked"); };
    assert.equal(load_playback_volume(), 0.15);
    const blocked = new CircuitryAudioController();
    blocked.set_volume(0.1);
    assert.equal(blocked.volume, 0.1);
    blocked.dispose();
  } finally {
    delete globalThis.window;
  }
});
