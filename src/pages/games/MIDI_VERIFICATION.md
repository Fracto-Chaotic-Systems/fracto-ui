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
