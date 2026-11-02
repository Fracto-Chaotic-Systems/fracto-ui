# MIDI samples and parser verification

Verified November 2, 2026. The results below record import-plan step 1.
Step 2 has since added the validating adapter in [music/](music/README.md);
the playback controller has since been added as well. The All Music page controls have now been integrated too.

## Piano samples

Source: the GrandB URL construction in the legacy `util/UtilMidi.jsx`.
Read-only HEAD requests checked every MIDI pitch 0–127 in each of p/mp/mf/f/ff,
with `Origin: http://localhost:3006` (640 requests).

| Layer | Available pitches | HTTP 200 | CORS |
| --- | --- | --- | --- |
| p | 21–108 | 88 | `Access-Control-Allow-Origin: *` |
| mp | 21–108 | 88 | `Access-Control-Allow-Origin: *` |
| mf | 21–108 | 88 | `Access-Control-Allow-Origin: *` |
| f | 21–108 | 88 | `Access-Control-Allow-Origin: *` |
| ff | 21–108 | 88 | `Access-Control-Allow-Origin: *` |

All 440 accessible responses identify `audio/mp3`; their combined encoded size
is 39,351,856 bytes. Pitches 0–20 and 109–127 return 403, so treat these as
unavailable; do not silently construct URLs outside 21–108.

An isolated production Vite bundle served from loopback fetched and decoded
pitches 21, 60 and 108 for all five layers in the in-app Chromium browser.
All 15 passed `fetch` and `AudioContext.decodeAudioData`: mono, about 10.033
seconds, decoded at the context's 48 kHz sample rate. This verifies actual
browser cross-origin access and representative MP3 decoding, not audible
playback or decoding every individual sample. Other browser engines remain
untested. Long notes will eventually need an explicit policy because the
samples last about ten seconds; do not assume unlimited acoustic sustain.

Use the existing remote sample URLs initially. No sample reuse/distribution
license was found in the reviewed MIDI source tree or project README. Public
access does not establish a redistribution license; ownership/terms remain
unconfirmed. No sound assets were added to the repository.

## Parser compatibility

Installed and pinned `midi-parser-js` **4.0.4**, also the npm registry's latest
version at verification. It has no runtime dependencies. Package metadata
labels its license `GPL`; the distributed LICENSE is GPL version 3. The target
UI already contains a GPLv3 LICENSE. This records the package facts, not a
conclusion about the piano samples' licensing.

The package's CommonJS default export works with Node ESM imports and Vite's
production CommonJS conversion. A minimal probe built using the app's actual
Vite config and executed successfully in the browser. The project currently
resolves Vite 7.3.6 and React 19. No React adapter, Tone.js or Node polyfills
are required for the Uint8Array parse path.

Verified output contract:

- `formatType` is numeric, `tracks` is the declared count, and `track[]` holds
  `{ event: [...] }` objects.
- `timeDivision` is PPQ ticks per quarter note for ordinary MIDI; it is **not
  BPM**, despite the upstream README's output-anatomy comment. Example: 480.
- SMPTE division is an array; bytes E7 28 produce `[103, 40]`. Reject this
  representation in the first adapter instead of interpreting it as PPQ or
  trusting its first value as signed SMPTE frames per second.
- Channel events use numeric types 8/9/11 and zero-based `channel` values
  0–15. Note/controller data is a two-number array. Velocity-zero note-on
  remains type 9; the adapter must interpret it as note-off.
- Tempo meta events are `type: 255`, `metaType: 81`, with numeric `data` in
  microseconds per quarter note (500000 tested). `deltaTime` is relative ticks.
- Running-status note events and format 0/1 files work in targeted fixtures.

### Required workaround and validation

The default handler for unknown meta events reads their payload **twice** in
`src/main.js`. A sequencer-specific 0x7F event followed by a note reproduces
corruption of the following events. The supported `customInterpreter` hook
fixes this by consuming the metadata payload exactly once and returning a
non-false value. The compatibility test demonstrates the fix. For SysEx
(`length === false`), the hook can return false to retain the default handler.
The hook is mutable parser-wide state: install it centrally in the future
adapter, rather than changing it from React components.

The parser returns false for an invalid header but can accept a truncated file
and return partial events with negative delta times. It also ignores declared
track chunk lengths while scanning events. Step 2 therefore needs a bounded
structural validation pass (header/format/division, chunk lengths, VLQs, event
payload bounds and end-of-track), result validation, file-size limits, and
error handling before accepting a song. Format 2 and SMPTE remain unsupported.
Use a worker or other execution bound if parsing untrusted input can block the
UI; catching exceptions alone is insufficient for malformed event loops.

### Legacy corpus

Scanned all **190** `.mid`/`.MID` files in the legacy test tree: 13 format 0,
177 format 1. The raw parser returned objects for all, but some had corrupt
or empty note output. Repeating with the unknown-metadata hook produced
nonempty notes in all 190, with no negative delta times or out-of-range channel
message data under the scan's checks. This is structural characterization,
not proof of musical correctness for every song.

The Queen example contains pitch 12, below the sampled piano range. Step 2/3
must report unsupported notes or define a deliberate fallback; do not silently
claim every legacy file is playable with this sample set. Preserve all tracks
and channel information so later percussion/instrument policy remains possible.

## Decision and checks

Proceed with this exact parser version behind a validating adapter and the
metadata hook. Reuse the existing sampled-piano URL rules for pitches 21–108.
No framework migration is needed. The parser cannot be used raw as the final
file validator, and sample redistribution terms remain unresolved.

`node --test test/midi_parser_compatibility.test.js` passes three focused
compatibility tests covering the contract and hook. The isolated Vite browser
probe also passes. The full `npm run build` passes (2,803 modules); Vite emits
its existing large-chunk advisory. Targeted ESLint and diff whitespace checks
also pass. Raw request, corpus and browser results are retained in the task
artifacts directory as `samples.json`, `parser-results.json`,
`corpus-with-hook.json` and `browser-results.json`.

Upstream references: [parser source and documentation](https://github.com/colxi/midi-parser-js),
[exact npm package metadata](https://registry.npmjs.org/midi-parser-js/4.0.4).

## Step 2 follow-up

The validating adapter now passes all 190 legacy files with finite, ordered
note times. Twenty-five append eight bytes beyond their declared complete
tracks; these are excluded from the parser input and reported using
`trailing_bytes_ignored`. The required hook is applied for each synchronous
parse and restored afterward. Metadata/chunk validation bounds the legacy
parser before it runs. Focused Node tests, targeted lint and a Vite build of
the new module entry pass. Corpus details are retained in `step2-corpus.json`
in the task artifacts directory.


## Audio scheduler follow-up

The controller, sample cache, scheduler and independent note voices now exist
in music/. Lifecycle tests cover Stop during resume/fetch/decode, stale file
replacement, replay, duplicate Play, completion, errors and disposal. Tests
also cover sample coverage/layer rules, deduplication, download concurrency,
cache limits, release tails, late scheduling and overlapping channel voices.

A production Vite probe executed the real voice code in Chromium using
OfflineAudioContext: two overlapping voices rendered nonzero audio, a third
cancelled voice was removed, the remaining voice continued independently,
and output after all stops was exactly silent. All three cleanup callbacks
ran. The same bundle imported the full controller successfully. This is an
actual Web Audio render, not a claim of audible page playback. Raw results
are saved in `step3-browser.json` in the task artifacts directory.

`npm run test:midi` passes all 33 MIDI tests. Targeted ESLint, formatting,
whitespace checks and the production Vite browser-probe build pass. The probe
does not change the All Music page or start audible playback.


## All Music controls follow-up

GamesMusic now uses the real controller through useMidiPlayer. A production
Vite harness renders the actual component under React StrictMode. Browser
checks verified file-chooser import, filename/duration, Play through the real
GrandB sample fetch/decode path, Stop, replay, natural completion at 0:05,
invalid-file errors, recovery with a valid file, and navigating away while
playing. The harness observed the old AudioContext state become closed on
unmount. File contents remain browser-local.

The first live timer test exposed an Illegal invocation error: the scheduler
stored native window timer functions and called them with its own receiver.
Default timer wrappers now invoke the browser functions without that receiver;
a regression test covers the binding. All Music browser checks passed after
this fix. Controller unload also has a regression test covering stopped voices,
cleared cache/song, and context reuse. Run `npm run test:midi` for the suites.

All 35 MIDI tests, targeted ESLint and whitespace checks pass. Browser results
are retained in `step4-browser.json` and the test harness source is retained
in the task artifacts directory. The production app build also passes, with
the existing Vite large-chunk advisory.


## Final timing, lifecycle and sound checks

Step 5 passed on November 2, 2026. `npm run test:midi` now passes **40 tests**.
Added coverage checks absolute context time starting at 100 seconds, 12-second
notes without the old cutoff, allocation failure halfway through a chord,
late scheduling after sample exhaustion, failed/empty decode retry, and 50
Play/Stop cycles with zero timers and disconnected voice nodes afterward.

The reproducible browser harness is `test/midi_browser/`. It renders the
actual page under React StrictMode and uses a generated format-1 MIDI with
six notes, two tempos and sustain. The first chord's key releases occur at
0.6 seconds but sustain holds it until 1.2; the second chord runs 1.2–1.5.
The default GrandB piano samples are fetched and decoded by the real controller.
A test-only AudioWorklet records a tee from the same master graph that remains
connected to the browser's actual speaker destination; no microphone or OS
loopback recording is used.

Measured stereo output at 48 kHz:

| Check | Result |
| --- | --- |
| Active piano output | RMS 0.04119, peak 0.25363 |
| After Stop (60–250 ms later) | RMS 0, peak 0 |
| After replacing the file (50–150 ms later) | RMS 0, peak 0 |
| Replay and natural completion | Passed |
| Navigate away while playing | Context state closed |
| Older file read completing after newer selection | Newer file retained |
| Stop while file read is pending | No file becomes loaded afterward |
| File read failure then valid file | Recovered |

The saved 4.291-second PCM WAV has audible-level signal (overall RMS 0.03759,
peak 0.27246) and zero clipped samples. This verifies the browser graph's real
non-silent output, not a subjective assessment of sound quality or a check of
physical speakers/system volume. The WAV includes Stop silence and replay.
Artifacts are in the task's `midi-verification/step5/` directory:
`browser-results.json`, `capture-analysis.json` and `playback.wav`.

Targeted ESLint, formatting and whitespace checks pass. The app's production
build passes with its existing Vite large-chunk advisory. No additional
production changes were needed for this verification step.


## Track display model — step 1

The song now retains stable note IDs, start/key-release/end ticks, instrument
and track name history, timed meter/pedal/program/controller events, provenance,
and explicit inferred default tempo/meter records. MidiDisplayModel groups
note-bearing tracks and track/channel routes while retaining conductor/empty
tracks separately. Parsed songs and display models are immutable; route notes
share the original note objects. useMidiPlayer exposes the song outside its
progress snapshot and preserves the reference during transport updates.

All **47 MIDI tests** pass, including seven new metadata/display tests. A scan
of all **190 legacy files** compared each note's track/channel/pitch/velocity,
program and start/key-release/end seconds against the committed pre-metadata
MidiTimeline implementation. Every note and song duration matched exactly;
IDs were unique and display grouping retained every note. Scan details are in
`display-model-corpus.json` in the task's MIDI verification artifacts.

The real StrictMode browser harness also passed immutable hook song exposure,
stable references, no song in progress snapshots, clearing during replacement,
stale-read handling, piano output, silent Stop/replacement and context closure.
Browser results and captured output are in the `display-metadata/` artifact
subdirectory. Targeted lint, formatting and whitespace checks pass. This step
adds the data foundation; the track viewer and instrument controls remain planned.

The production app build also passes (2,817 modules), with the existing Vite large-chunk advisory.


## Track viewer — step 2

All Music now renders track/channel strips below the transport, with a seconds
ruler, logarithmic zoom, fit-to-view, selectable sticky labels and metadata
summaries. Only visible rows plus overscan have viewport-sized canvases.
Dense passages use an occupancy overview instead of per-note DOM elements.
The outer Games pane owns vertical scrolling for short screens.

All **54 MIDI tests** pass. Seven geometry tests cover fit bounds over tiny
and very long songs, zoom anchoring, ruler spacing/formatting, clipping,
zero-length notes, row virtualization and interval queries over 100,000 notes.
The browser checks actual colored note pixels, row selection, horizontal zoom,
fit reset, label/canvas alignment after both-axis scrolling, resize to a 360px
pane, 64-track virtualization, a dense 10,000-note strip and replacement reset.
A per-load song revision resets view state even for files with the same name.

The real piano playback regression still passes: non-silent output, exact
silence after Stop/replacement, replay/completion and context closure on unmount.
Results are retained in `midi-verification/track-viewer/browser-results.json`
and playback.wav in the task artifacts. Targeted lint, formatting, whitespace
checks and the production build pass. Playhead/highlighting and event lanes
remain step 3; this viewer does not seek or change audio behavior.


## Track synchronization — step 3

The viewer now has one audio-clock playhead, held versus pedal-held note
highlights, pale sustain tails, follow on/off, and tempo/meter/channel-pedal
lanes whose current labels follow the cursor. Static note/event canvases stay
cached; a separate transparent highlight overlay reuses buffers at up to
30 paints/second. Stop clears overlays and resets the cursor; completion
retains the endpoint; a replay identity avoids reusing the previous frame.
No per-note timers or audio-to-React refs are introduced.

All **62 MIDI tests** pass. New coverage includes exclusive highlight end
boundaries, repeated pitches, follow viewport clamps, simultaneous event
lookup, inferred/empty lanes, independent channel pedal spans and Reset
Controllers, one animation request loop and cancellation, and scheduling
lead-in versus a new replay. Targeted lint, formatting and whitespace checks
pass; the full production build passes (2,828 modules) with the existing
large-chunk advisory.

The StrictMode browser harness verifies the rendered playhead against real
scheduled audio time, blue held notes transitioning to amber sustained notes,
100-to-200 BPM and default 4/4-to-3/4 transitions, and pedal down-to-up state.
Follow-off preserves a manual scroll to the far end; follow-on recenters the
cursor. Stop clears both state counts and every highlight canvas pixel;
completion clears highlights and keeps the final cursor, and replay resets it.
Existing zoom/fit/dense-file, import-race, silent Stop/replacement, non-silent
piano playback and context-close checks continue to pass. Results and audio
are retained in the task's `midi-verification/track-sync/` artifact directory.


## Working mixer — step 4

The selected track/channel now exposes Mute, Solo, Volume and Pan, with Reset
mix applying to all routes. Voice outputs route through per-track/channel
gain/pan buses. Live updates ramp over 12ms without recreating sources; mute
wins over solo, multiple solos are supported, and other tracks sharing a MIDI
channel remain independent. Stop/completion/error/disposal release all buses;
Stop/replay preserves overrides, while replacement resets them. Imported MIDI
volume/expression/pan automation is still metadata and is explicitly not applied.

All **69 MIDI tests** pass. New tests cover immutable normalized settings,
route isolation, multi-solo/mute precedence, absolute-time ramps, partial graph
allocation failure, active/scheduled route destinations, preparation edits,
reset/replay/replacement behavior, cleanup and unsupported-route validation.
Targeted lint, formatting and whitespace checks pass. The production build
passes (2,830 modules) with the existing Vite large-chunk advisory.

The browser drives the actual controls while two tracks share channel 1:

| Live operation | Captured result |
| --- | --- |
| Volume 100% to 20% | RMS fell from 0.03912 to 0.00525 |
| Full left | Left RMS 0.03439; right RMS 0 |
| Full right | Right RMS 0.02113; left near numerical zero |
| Mute | Both channels exactly silent |
| Muted solo with a non-solo unmuted track | Both channels exactly silent |
| Add a second unmuted solo | Audible output restored |
| Mute both solos | Both channels exactly silent |
| Reset mix | Both routes restored to defaults and audible output |
| File replacement / Stop | Both channels exactly silent |
| Navigate away | Context closed |

The volume windows occur at different times in a naturally decaying sample,
so their RMS ratio is not a calibrated gain measurement. Unit tests verify the
exact gain coefficient; the browser verifies an audible-level reduction.
Only the two original sources were started during live edits, proving controls
do not restart voices. All earlier track rendering, synchronization, import-race
and piano playback checks also pass. Full results are retained in the task's
`midi-verification/track-mixer/browser-results.json`; mixer-playback.wav records
the live mixer checks separately from the ordinary playback regression audio.


## Instrument assignment verification (2026-11-02)

77 MIDI tests pass, including eight assignment tests for verified catalogs,
per-note program resolution, bank support, provider/version cache isolation,
immutable per-song assignment and cancellation during fetch/decode. Targeted
lint and production build pass (existing large-chunk advisory remains).

Discovery found only the existing remote GrandB piano. Representative p/mp/mf/f/ff
assets at pitches 21, 60 and 108 returned HTTP 200 and CORS `*`; prior complete
440-asset checks and browser decode verification remain applicable. Bucket
instrument listing returned 403. No additional timbre is enabled and no samples
were copied. Unsupported original programs/banks remain disabled; the explicit
piano override remains available for supported pitched notes.

Focused browser instrument checks pass: captured active RMS 0.01497, peak
0.04759; after assignment change, 16,318 captured channel samples were exactly
silent. Explicit Play restarted playback, volume remained 40%, unsupported
program 13 and bank 3:0 original assignments were disabled, and navigation
closed the context. Only Original MIDI and verified GrandB were listed.
Results: task artifact `midi-verification/instrument-assignment/instrument-results.json`.
The initial hidden-tab full regression timed out waiting for animation highlights;
use a visible tab for timing checks. A visible run reached the new instrument
check after passing the existing checks; the fixture initially used 0.4 rather
than 40 slider units and was corrected before the passing focused verification.

A final visible full-suite rerun timed out at the existing pedal-held highlight
window. The focused instrument verification passes independently; the final
full browser regression is not reported as a pass. Its timing-sensitive
highlight waits need separate stabilization.


## Interface step 6 verification (2026-11-02)

| Check | Result |
| --- | --- |
| MIDI unit suites | 79 passed, zero failures |
| Targeted lint: MIDI source, page/text, MIDI tests and browser harness | Passed |
| Production build | Passed; existing large-chunk advisory remains |
| Expanded browser harness production bundle | Passed (90 modules) |
| Corpus against committed playback milestone | 190 files, 621,307 notes, 1,285 routes; unchanged original note fields and song durations; complete unique display grouping |
| Revised real-browser rendering/audio/resource run | Pending browser tool access |

Added regression tests verify that natural completion disconnects routes and
voices, clears timers, and retains mix/assignment for replay; old completion,
error and pump callbacks cannot disturb the next playback. Twenty combined
mix/assignment/replacement cycles leave no connected voices, gains, panners,
buses, buffers or timers; dispose closes once and suppresses later callbacks.

The browser fixture now lasts 6s: held 0–2.4s, pedal-held 2.4–4.8s, final chord
4.8–6s. This provides longer observation windows for real scrolling and follow
checks, retaining the 120ms clock tolerance. It addresses a suspected timing
race in the test sequence; resolution is not claimed without a browser run.
New browser checks suspend/resume audio time and require frozen playhead and
held highlights. Final cleanup accounts for pending RAFs/intervals, open audio
contexts, connected product nodes and retained source callbacks, all zero.

The browser tool reported local browser use disabled. The user enabled it, but
retry and a fresh connection still returned the same disabled status. The revised
browser tests therefore have **not** executed; earlier browser passes and PCM
captures above are historical and do not establish a pass for these revisions.
The temporary server was stopped. Corpus results are retained in the task
artifact `midi-verification/final-interface/corpus-results.json`.

Resume with the README harness command, a visible tab, and Run playback
verification; confirm `pass: true` plus zero cleanup counts, then update this
report with the resulting audio/rendering measurements.
