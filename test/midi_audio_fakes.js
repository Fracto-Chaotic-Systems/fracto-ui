export const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
export const flush = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
export class FakeParam {
  events = [];
  value = 1;
  setValueAtTime(value, time) {
    this.events.push(["set", value, time]);
    this.value = value;
  }
  linearRampToValueAtTime(value, time) {
    this.events.push(["ramp", value, time]);
  }
  cancelScheduledValues(time) {
    this.events.push(["cancel", time]);
  }
}
class FakeNode {
  connections = [];
  disconnected = false;
  connect(node) {
    this.connections.push(node);
    return node;
  }
  disconnect() {
    this.disconnected = true;
    this.connections = [];
  }
}
export class FakeContext {
  currentTime = 0;
  destination = {};
  state = "suspended";
  sources = [];
  gains = [];
  pans = [];
  resume_count = 0;
  close_count = 0;
  decoded = 0;
  buffer = { duration: 10, length: 480000, numberOfChannels: 1 };
  async resume() {
    this.resume_count++;
    this.state = "running";
  }
  async close() {
    this.close_count++;
    this.state = "closed";
  }
  async decodeAudioData() {
    this.decoded++;
    return this.buffer;
  }
  createGain() {
    const node = new FakeNode();
    node.gain = new FakeParam();
    this.gains.push(node);
    return node;
  }
  createStereoPanner() {
    const node = new FakeNode();
    node.pan = new FakeParam();
    this.pans.push(node);
    return node;
  }
  createBufferSource() {
    const node = new FakeNode();
    node.start = (time, offset) => {
      node.started = [time, offset];
    };
    node.stop = (time) => {
      node.stop_at = time;
      if (time === undefined) {
        node.stopped = true;
        node.onended?.();
      }
    };
    this.sources.push(node);
    return node;
  }
  finish_due() {
    for (const source of this.sources) {
      if (!source.stopped && source.stop_at <= this.currentTime) {
        source.stopped = true;
        source.onended?.();
      }
    }
  }
}
export const fake_timers = (context) => {
  let next = 0;
  const timers = new Map();
  return {
    timers,
    set_interval: (callback) => {
      timers.set(++next, callback);
      return next;
    },
    clear_interval: (id) => timers.delete(id),
    advance: (seconds) => {
      context.currentTime = seconds;
      context.finish_due();
      for (const callback of [...timers.values()]) callback();
      context.finish_due();
    },
  };
};
export const response = () => ({
  ok: true,
  arrayBuffer: async () => new ArrayBuffer(8),
});
export const note = (
  start_seconds = 0,
  end_seconds = 1,
  channel = 0,
  pitch = 60,
) => ({ start_seconds, end_seconds, channel, pitch, velocity: 100 });
export const song = (notes = [note()], duration_seconds = 1) => ({
  notes,
  duration_seconds,
  warnings: [],
});
export const midi_file = () =>
  new Uint8Array([
    77, 84, 104, 100, 0, 0, 0, 6, 0, 0, 0, 1, 1, 224, 77, 84, 114, 107, 0, 0, 0,
    13, 0, 144, 60, 100, 131, 96, 128, 60, 0, 0, 255, 47, 0,
  ]);
