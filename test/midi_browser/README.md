# MIDI browser verification

## Current default: FluidR3 GM (migration step 6)

The catalog now declares `default_library_id: "fluidr3-gm"`. All Music selects it
when catalog discovery completes, and new files use **Original MIDI assignment**.
Each note resolves its recorded GM program within FluidR3, including program
changes. The selection persists across file replacement within the mounted page;
manual route overrides reset on replacement. Explicit Legacy selection and
compatible manual overrides survive catalog refresh. Before discovery or when the
catalog cannot be loaded, the existing GrandB fallback remains available.

Legacy recordings is still selectable and all 149 instruments remain enabled.
Missing/silent keys, percussion and nonstandard banks report unavailable rather
than silently substituting piano. Samples remain finite, without invented loops
or additional velocity layers. This changes the default choice, not the audio
assets, gain, or memory limits. To roll back, set the catalog default to `legacy`
and validate it using `npm run instruments:verify`; clients receive it on refresh
unless they explicitly selected a library. Earlier step 4/5 reports record the
historical Legacy default.

Validation: 117 MIDI tests cover initial defaults, replacement, late discovery,
manual overrides and Legacy selection. Full catalog verification confirms all 149
enabled instruments. Production build and targeted lint pass.


Current playback status (2026-11-02): **all 21 instruments are enabled** after
75 native Chromium decode/render probes (low/middle/high pitches of every
recording layer) passed through the sample cache and voice engine at 48 kHz.
The catalog marks them playback_verified; detailed evidence is recorded in
browser-verification.json in the asset-server instruments directory. Earlier
disabled/pending statements below describe the initial migration stages.
Native probes confirm signal output, not a subjective listening review.
Reload All Music to fetch the updated catalog. A source can still be disabled
for a track containing notes outside that instrument's verified pitch range.


Latest 2026-11-02 verification: full page suite and native flute asset suite PASS.
Dated reports live in ../midi_reports/. Earlier failures below are historical.

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

`TrackChecks.js` exercises the actual viewer before audio checks: selection,
zoom and fit, sticky label alignment, a 360px pane, virtualized 64-track input,
a dense 10,000-note strip, and view reset on replacement. Load track preview
opens the small fixture without starting audio, for manual visual inspection.

`SyncChecks.js` compares the rendered playhead with scheduled audio time,
verifies held/pedal-held highlights and event-lane changes, tests follow-off
manual scrolling and follow-on recentering, and checks Stop/replay/completion.
The fixture now includes an explicit 4/4-default to 3/4 meter change at 4.8s.

`MixerChecks.js` selects two tracks sharing the same channel and exercises the
actual mute/solo/volume/pan controls. It measures left/right PCM energy, checks
multi-solo/mute precedence, verifies reset/replacement and confirms voices do
not restart when editing the mix. The separate mixer capture is saved as
`mixer-playback.wav` beside the ordinary `playback.wav`.

InstrumentChecks.js verifies verified-only options, supported original piano, unavailable programs/banks, separate file/effective labels, preservation of volume, explicit replay after an assignment change, captured output silence and context disposal. Run the harness in a visible tab so animation-frame timing is exercised.


Final verification fixture: 120 ticks per quarter, six seconds total. The first
chord has held keys from 0–2.4s and pedal-held notes from 2.4–4.8s, then a second
chord ends at 6s. Longer phases allow real scroll/follow operations between
assertions; the 120ms playhead/audio-clock tolerance is unchanged. SyncChecks
also suspends/resumes the real AudioContext and checks frozen time/highlights.

ResourceChecks.js accounts for pending animation frames and intervals;
Capture.js tracks product-owned node connections and source callbacks. The full
run requires every context closed and every count zero after the final unmount.
The capture branch's own analyser/worklet nodes are excluded from product-node
counts; closing their context releases them. These wrappers exist only in tests.
The two new controller regression cases cover completion and stale callbacks
across replay, plus twenty combined mix/assignment/replacement lifecycle cycles.

Latest status: expanded harness compiles, but has not run. Browser tool access
was disabled even after the settings change and connection reset. Earlier 1.5s
fixture timeouts are retained in the verification report; the longer fixture
reduces a suspected observation-window race and is not yet a verified fix.


## Asset-engine verification

Press Run asset-engine verification in a visible tab. The loopback harness mounts
the actual asset router at `/api/asset/instruments`, initializes runtime service
ports and explicitly opts into prepared flute assets only for this test. Product
catalog flags are unchanged. AssetEngineChecks.js tests native decoding, shared
polyphony, replay, Stop silence, bounded held notes and resource cleanup. It writes
asset-engine-results.json and asset-engine-playback.wav to the output directory.
The 2026-11-02 run passed at 48 kHz. Background tabs may suspend the native audio
clock; keep the verification tab visible. Signal capture proves output at the
AudioDestination graph, not physical speaker volume or subjective sound quality.

Additional browser regression run (2026-11-02): the full playback harness stopped
at TrackChecks “Zoom did not enlarge timeline” before its audio checks. This
run does not establish a pass for the broader rendering suite. The independent
asset-engine browser check above passed.


Final assignment checks wait for the actual catalog and assert all 21 server
names appear as disabled inventory alongside the two fallback/original choices.
Discovery must not change the default assignment. The worklet records rendered
zero-input silence, and the boundary test waits for delivered PCM before checking.
These recorder changes affect tests only. Reports establish graph output, not
physical speakers or per-instrument certification. All catalog enable flags stay false.


## FluidR3 native verification

Run Verify FluidR3 representatives, then Verify complete FluidR3 library after a
reload. FluidChecks.js uses native OfflineAudioContext and the real cache/voice
code for all 10,648 non-silent notes and 1,099 chunks, checks release silence,
program scoping and all 616 excluded keys, and checkpoints each instrument.
Representatives also use actual AudioContext output capture with AssetEngineChecks
parameterized for the prepared source, checking four shared voices, replay, Stop,
finite source boundaries and cleanup. The A/B export has 14 C4 clips: legacy then
FluidR3 for piano/flute/violin/bass/guitar/organ/vibraphone. Each clip is 5.4s.

Outputs: fluidr3-representatives.json, fluidr3-complete.json and
fluidr3-ab-audition.wav. The asset-server analyze_fluidr3_audition.py produces
spectral evidence and a separate level-matched audition. No source audio is
changed. Full notes are native-rendered at 48kHz; subjective quality and other
browsers/rates are not certified. Prepared-source access is test-only; enablement
is unchanged by the harness.

TrackChecks now measures zoom against the note area excluding fixed-width
labels, so narrow panes do not falsely fail. Audition frame counts use rounding.


## FluidR3 library selection (migration step 5)

All Music offers **Sound library** and **Refresh libraries** before loading a file.
All 128 verified FluidR3 GM instruments are enabled; Legacy recordings remains the
catalog and initial UI default. Changing that global default is step 6.

Choosing a library stops playback and pending sample preparation, clears decoded
sample caches, and requires Play again. Unmodified routes use Original MIDI
assignment within the chosen library, including each note's program changes.
Compatible explicit overrides remain assigned even across libraries; the retained
option includes its library name. Mixer settings and parsed file metadata remain
unchanged. New files reset route overrides/mix but retain the selected library for
this mounted page. Leaving the page resets that choice.

Instrument menus show the selected library, GrandB piano fallback, and any retained
cross-library override. Original assignments never silently substitute another
library. Nonzero banks, percussion, missing programs, and excluded silent keys
remain unavailable; choose a supported explicit override when appropriate.
Catalog refresh retains the selection if playable, otherwise uses the catalog
default. Failed discovery retains the last usable registry and fallback piano.
Audio stays lazy: only the song's required chunks download on Play.

Validation: 115 MIDI unit/integration tests, production build, targeted lint,
29 asset-server tests, full catalog integrity verification (149 enabled instruments),
and native Chromium 48 kHz library switching/GM flute output/Stop/refresh/replacement/
cleanup checks. The original full-library sample verification still applies to the
unchanged audio assets. Human quality ranking and other browsers are not certified.
