class PcmCapture extends AudioWorkletProcessor {
  process(inputs) {
    const channels = inputs[0];
    if (channels?.[0]) {
      const left = channels[0].slice();
      const right = (channels[1] ?? channels[0]).slice();
      this.port.postMessage({ time: currentTime, left, right }, [
        left.buffer,
        right.buffer,
      ]);
    }
    return true;
  }
}
registerProcessor("pcm-capture", PcmCapture);
