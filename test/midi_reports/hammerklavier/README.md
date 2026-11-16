# Full Hammerklavier playback — 2026-11-15

`hammerklavier-playback.json` is the native Chromium report for the local
`beethoven_hammerklavier_1.mid` input: 74,228 bytes, 8,290 notes, 593.400583 seconds.
SHA-256: `e5fa95ea1daf5c0c9fd3f3dfa95acede8a59462ac03d968a446d504ea3f1ad61`.
The MIDI itself is not copied or committed.

| Assignment | Mode | Notes scheduled | Skipped | Buffer waits | Peak decoded | Peak managed |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| FluidR3 / Original MIDI assignment | preload, 7 assets | 8,290 | 0 | 0 | 48.83 MiB | 61.65 MiB |
| GrandB piano / explicit Legacy override | windowed, 189 total assets | 8,290 | 0 | 0 | 99.20 MiB | 115.23 MiB |

Both runs reached natural completion on native 48 kHz audio clocks; neither used
an accelerated clock or truncated the piece. The master signal was measured
before a muted output gain, so this verifies native rendering/scheduling rather
than physical speakers or subjective listening. The managed cap remained
256 MiB, with at most two simultaneous decoder jobs per player. Browser/driver
overhead and delayed garbage collection are outside that managed budget.
The report retains measured maximum scheduling lateness under this test's load.

After disposal both contexts were closed, caches contained zero decoded bytes,
and active pins/decoder jobs were zero. The 145-test MIDI suite, targeted lint,
feature-catalog check and separate production UI build passed.

Reproduce using `../../midi_browser/serve-long-piece.mjs` as documented in
`../../midi_browser/README.md`. `long-piece-dist/` is the ignored test build;
its generated summary is a view of these results rather than a separate test.
