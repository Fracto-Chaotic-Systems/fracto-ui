# Minimal MIDI playback import plan

## Scope

Bring local MIDI-file playback into Games > music > All Music. Initial controls:
Open MIDI, Play, and Stop, plus filename, loading/playing/completed status, and
an actionable error. Playback uses the legacy GrandB sampled piano for every
pitched track. Full General MIDI instrument/percussion support, editing,
visualizers, cloud browsing, seeking, and pause/resume are outside this first pass.
Asset/parser verification, event preparation, sample loading and the audio
controller and All Music page controls are implemented. The original numbered
sequence below records the completed modules and validation scope.

## Source responsibilities

Source root: `D:/mediaplex/react-apps/src/midi`.

| Source | Purpose | Import decision |
| --- | --- | --- |
| `MidiPlay.jsx` | Global MAIN_APP, 32 audio processors, audio graph, transport state, app composition | Replace with page-owned controller; retain the piano playback concept |
| `menu/MenuOpen.jsx` | FileReader local load and remote-open menus | Retain local ArrayBuffer input only |
| `util/UtilMidi.jsx` | midi-parser-js adapter, tick merging, tempo conversion, sustain, voice allocation, velocity sample selection, envelopes | Extract and correct as pure JavaScript modules |
| `audio/AudioPlayback.jsx` | Per-event timeouts, processor queuing, UI profiler | Replace scheduler and remove UI dependencies |
| `audio/AudioProcessor.jsx` | HTMLAudioElement per voice, gain envelopes, sample loading | Replace with decoded buffers and independent audio source per note |
| `module/ModuleTransport.jsx` | Play/Pause/Stop buttons calling MAIN_APP | Rebuild minimal controls with current UI styles |
| `app/AppHeader.jsx`, `app/AppModules.jsx`, other `module/` files | App shell, processor lights, tone-walker canvas | Exclude |
| `app/AppFiles.jsx`, `app/viewers/`, `app/tracks/` | Piano roll, harmony/code views, zoom and event displays | Exclude; remove action.ref/intensity callbacks from audio |
| `resource/ResourceColors.jsx`, `resource/ResourceTones.jsx` | Visual styling, pitch-color and harmonic transformations | Exclude |
| `menu/`, `interface/`, remaining `util/` files | Old menus, forms, dropdowns, storage and controls | Exclude; no AWS SDK or old framework dependencies |
| `app/files/` | Incomplete file abstractions; FileMidi imports missing FileBasis | Exclude |
| `test/` | MIDI example collection, not automated assertions | Use a small selected fixture set for verification, not the entire library |
| `doc/` | MIDI specification reference | Leave in source project |

The old project declares React 16, CRA/react-scripts 3, styled-components 4,
`midi-parser-js` ^4.0.4 and Tone ^14.7.77. The MIDI playback path does not
import Tone: its sound engine is native Web Audio plus remote MP3 samples.
The target already uses React 19, Vite and styled-components 6. No React,
router, styling framework, AWS SDK, or Tone migration is necessary.

## Corrections required before reuse

- Remove MAIN_APP imports/circular dependencies and the hard-coded processor
  count from parsing. Parsed events must contain data, not React refs.
- Merge absolute track ticks before interpreting channel state. Sustain currently
  carries across track traversal, uses `> 64` rather than `>= 64`, and is not
  scoped to MIDI channel. Preserve channel and track metadata.
- Pair note-on/off by channel and pitch with explicit overlapping-note handling.
  Current duration searches use pitch alone, while processor allocation also
  keys only by pitch. Treat velocity-zero note-on as note-off.
- Preserve tempo integration across tracks, including the default 500,000
  microseconds per quarter note. Define stable ordering for simultaneous events.
  Explicitly reject unsupported format 2 and SMPTE division initially rather
  than applying the PPQ calculation to them.
- Handle invalid files, empty files, unmatched note-offs and unfinished notes
  predictably; avoid assertions that only log and let broken actions continue.
- Remove the arbitrary 9-second decay-start cap that cuts sustained notes short.
  Keep note duration and release envelope separate.
- Replace one timeout per event and HTML media loading during playback with a
  bounded lookahead scheduler using the audio context clock and cached decoded
  samples. Avoid the fixed 1.5-second startup assumption.
- Stop must silence active sources and cancel scheduling/loading callbacks.
  Legacy Stop only clears top-level timers/profiling; nested decay timers and
  audio survive. Pause currently behaves like Stop and restarts from the start.
- Replace repeated graph construction on Stop/Pause and the 32-channel
  splitter/merger graph with per-note gain/pan into a shared master output.
  Envelope times must use the context clock, not media-element currentTime.
- Create/resume audio from a Play gesture; handle failures and dispose on page
  unmount. The existing CircuitryAudioController demonstrates local patterns for
  context resume, stale-request invalidation, source cleanup and disposal, but
  its single waveform source is not a MIDI sequencer to reuse wholesale.

## Implementation sequence

1. **Confirm piano assets and parser.** Verify the legacy GrandB sample URLs,
   CORS, decode support and pitch coverage before relying on them. Source builds
   URLs beneath `https://mikehallstudio.s3.amazonaws.com/tone-gallery/instruments/GrandB/`
   with velocity layers p/mp/mf/f/ff. Current velocity mapping reaches p through f;
   preserve the existing selection initially. **Verification complete:** all 440
   piano samples (21–108, five layers) are accessible with wildcard CORS; 15
   representative samples decode in Chromium. Parser 4.0.4 works with Vite,
   but requires an unknown-metadata hook and structural input validation. See
   [MIDI_VERIFICATION.md](MIDI_VERIFICATION.md) for results and limitations.
   Check licensing before copying assets. Verify midi-parser-js compatibility
   with Vite and its returned channel, tempo and time-division representations;
   add only this parser dependency if suitable.
2. **Extract event preparation — complete.** See [music/README.md](music/README.md)
   for the implemented API, validation limits, timing/sustain policy and warnings.
   Verified against all 190 legacy MIDI examples; 25 require a warning for
   trailing export bytes.

   Original scope: Add `games/music/MidiEvents.js` with a parser
   adapter and pure timeline normalization. Return notes with channel, pitch,
   velocity, start/end seconds, track metadata and total duration. Add explicit
   supported-format validation and channel-local sustain handling.
3. **Extract the piano sample rules — complete.** Add `MidiPianoSamples.js` for the legacy
   filename/velocity rules and a configurable asset root. Fetch/decode only unique
   samples needed by the loaded file, cache them, bound concurrent requests and
   surface missing-sample errors. Define supported pitch coverage explicitly.
4. **Build the playback controller — complete.** Add `MidiPlaybackController.js` owning
   context, master gain, sample cache, lookahead scheduling and active sources.
   Expose load/play/stop/dispose and status callbacks. Schedule note sources and
   release envelopes on the audio clock, preserve legacy keyboard-position pan,
   and finish after the last release. Invalidate stale asynchronous work on
   Stop, replacement load or disposal. Keep resources outside React state.
5. **Wire All Music — complete.** Extend GamesMusic.jsx with a local `.mid`/`.midi` input,
   transport buttons and status/error text. File contents stay in the browser.
   Use a controller ref and effect cleanup; disable invalid actions, prevent
   duplicate Play and safely stop before replacing a file. Add text to
   GamesText.jsx, styles near this feature and a README for the new folder.
6. **Verify and document — complete.** See [MIDI_VERIFICATION.md](MIDI_VERIFICATION.md)
   for 40 passing tests, browser lifecycle assertions and recorded piano output.

   Original scope: Test tempo changes, formats 0/1, running status,
   simultaneous notes on different channels, overlapping pitches, sustain
   threshold/release, velocity-zero note-offs, long notes and invalid headers.
   Controller tests should cover Stop during loading/resume, repeated Play,
   natural completion, failed samples and disposal. Run targeted lint and the
   production build. In a browser, audibly verify a simple fixture and a
   polyphonic piano example, Stop/reload/replay, and leaving the music page.
   Update games/README.md with controls, supported MIDI features and asset setup.

## Acceptance boundary

A local format 0/1 PPQ MIDI file plays audibly through the sampled piano with
correct tempo, note lengths and sustain; Stop silences it, replay starts at zero,
and navigating away releases playback resources. Unsupported timing formats,
missing samples and malformed files produce clear errors. Program changes and
percussion require an explicit documented limitation rather than a claim of
full General MIDI fidelity. No legacy shell or visualizer is needed for this.

The implemented sample/controller API and cancellation behavior are described
in [music/README.md](music/README.md). Unit lifecycle tests and a Chromium
OfflineAudioContext render verify overlapping voices and cleanup; the actual All Music component has now been verified in a StrictMode browser
harness with real piano sample playback, Stop/replay, completion, invalid-file
recovery and page-unmount context closure.
