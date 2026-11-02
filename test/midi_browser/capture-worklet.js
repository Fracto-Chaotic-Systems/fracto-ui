class PcmCapture extends AudioWorkletProcessor {
  process(inputs) {
    const channels = inputs[0];
    // A disconnected final source can give the worklet zero input channels.
    // Record that rendered silence too, rather than leave a hole in the capture.
    {
      const left = channels?.[0]?.slice() ?? new Float32Array(128);
      const right =
        (channels?.[1] ?? channels?.[0])?.slice() ?? new Float32Array(128);
      this.port.postMessage({ time: currentTime, left, right }, [
        left.buffer,
        right.buffer,
      ]);
    }
    return true;
  }
}
registerProcessor("pcm-capture", PcmCapture);
