# MIDI browser verification

Run from fracto-ui: `node test/midi_browser/serve.mjs ABSOLUTE_OUTPUT_DIRECTORY`.
Open http://127.0.0.1:43191 and press Run playback verification. This builds the
actual All Music page under React StrictMode, uses its real controls, downloads
GrandB piano samples and plays them through the browser's default output.
It also captures the same master output in a test-only AudioWorklet branch,
without a microphone or system-audio permissions. Keep system volume comfortable.

The run tests sustain/tempo/polyphony, Stop silence, replay/completion, file
replacement, context closure and stale file-read cancellation. Results and a
stereo PCM `playback.wav` are posted only to the loopback test server and saved
in the named output directory. This verifies the graph signal sent to the
speaker destination, not physical speakers, OS volume or human sound quality.
Capture instrumentation and synthetic MIDI fixtures are test-only and never
imported into the product. No third-party test framework is required.

`main.jsx` runs the page checks. `fixtures.js` owns the generated MIDI.
`Capture.js` instruments only the test context and encodes the WAV;
`ImportProbe.jsx` exposes the hook for file-read race tests.
`capture-worklet.js` captures PCM. `serve.mjs` builds and serves the harness.
Stop the Node server after use. The output directory must be disposable: its
browser-dist subtree is replaced by Vite on each build.

Reload the page before each run. The run button starts real audio, including
short replay/replacement/navigation scenarios. A successful run ends with the
player unmounted and its context closed. The capture remains available for
listening after the server is stopped.
