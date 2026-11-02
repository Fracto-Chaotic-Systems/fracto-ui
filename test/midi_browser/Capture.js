export const contexts = [];
const NativeContext = window.AudioContext;
window.AudioContext = class extends NativeContext {
  constructor(...args) {
    super(...args);
    this.product_nodes = [];
    this.captured = [];
    this.scheduled_starts = [];
    contexts.push(this);
    this.master_created = false;
  }
  track_node(node) {
    this.product_nodes.push(node);
    const connect = node.connect.bind(node),
      disconnect = node.disconnect.bind(node);
    node.test_connected = false;
    node.connect = (...args) => {
      const result = connect(...args);
      node.test_connected = true;
      return result;
    };
    node.disconnect = (...args) => {
      const result = disconnect(...args);
      node.test_connected = false;
      return result;
    };
    return node;
  }
  createStereoPanner() {
    return this.track_node(super.createStereoPanner());
  }
  createBufferSource() {
    const source = this.track_node(super.createBufferSource());
    const start = source.start.bind(source);
    source.start = (...args) => {
      this.scheduled_starts.push({
        when: args[0],
        offset: args[1] ?? 0,
        duration: args[2],
      });
      return start(...args);
    };
    return source;
  }
  createGain() {
    const gain = this.track_node(super.createGain());
    if (this.master_created) return gain;
    this.master_created = true;
    const connect = gain.connect.bind(gain);
    gain.connect = (destination, ...args) => {
      if (destination !== this.destination)
        return connect(destination, ...args);
      const analyser = this.createAnalyser();
      connect(analyser);
      analyser.connect(destination); // Keep the actual speaker output connected.
      this.capture_ready = this.audioWorklet
        .addModule("/capture-worklet.js")
        .then(() => {
          const capture = new AudioWorkletNode(this, "pcm-capture");
          capture.port.onmessage = (event) => this.captured.push(event.data);
          const silent = NativeContext.prototype.createGain.call(this);
          silent.gain.value = 0;
          analyser.connect(capture).connect(silent).connect(destination);
        });
      return destination;
    };
    return gain;
  }
  async resume() {
    await this.capture_ready;
    return super.resume();
  }
};
export function rms(context, start, end) {
  let sum = 0,
    count = 0,
    peak = 0;
  for (const chunk of context.captured) {
    for (let i = 0; i < chunk.left.length; i++) {
      const time = chunk.time + i / context.sampleRate;
      if (time >= start && time < end)
        for (const channel of [chunk.left, chunk.right]) {
          sum += channel[i] ** 2;
          peak = Math.max(peak, Math.abs(channel[i]));
          count++;
        }
    }
  }
  return { rms: count ? Math.sqrt(sum / count) : 0, peak, samples: count };
}
export function wav(context) {
  const frames = context.captured.reduce(
    (count, chunk) => count + chunk.left.length,
    0,
  );
  const data = new ArrayBuffer(44 + frames * 4),
    view = new DataView(data);
  const text = (offset, value) => {
    for (let i = 0; i < value.length; i++)
      view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, data.byteLength - 8, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, context.sampleRate, true);
  view.setUint32(28, context.sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, frames * 4, true);
  let offset = 44;
  for (const chunk of context.captured)
    for (let i = 0; i < chunk.left.length; i++)
      for (const channel of [chunk.left, chunk.right]) {
        view.setInt16(
          offset,
          Math.round(Math.max(-1, Math.min(1, channel[i])) * 32767),
          true,
        );
        offset += 2;
      }
  return data;
}
