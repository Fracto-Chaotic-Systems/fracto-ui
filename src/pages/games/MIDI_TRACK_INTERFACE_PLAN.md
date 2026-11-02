# All Music track and instrument interface port

## Goal and current scope

Extend the working All Music player with the useful parts of the legacy track
interface: track strips, time/tempo information, zoom, playback position and
track controls. Rebuild against the current song model and controller rather
than importing the old app shell. This document records the staged plan. Steps 1–5 are implemented with GrandB as the sole verified sound source. Step 6 automated validation passes; final browser validation is pending tool access.

The source reviewed is `D:/mediaplex/react-apps/src/midi/app`. It contains a
working note/tempo display, but **not a working instrument manager**. The note
sidebar is placeholder text, the old MIDI preparation ignores program changes,
and audio always uses GrandB piano samples. Instrument controls and additional
instrument sounds must therefore be implemented, rather than simply copied.

## Legacy source map

| Legacy source | Actual behavior | Port decision |
| --- | --- | --- |
| AppFiles.jsx | Switches tracker/chordal/code viewers; scalar/walker currently use ViewerCode | Keep the track-view concept; omit the unrelated viewers initially |
| viewers/ViewerTracks.jsx | Groups nonempty note tracks, arranges lanes/sidebar, synchronizes scrolling, periodically follows playback | Rebuild as a pane-local track viewer with current props |
| tracks/TrackNoteEvents.jsx | Draws note blocks, subdividing simultaneous chords vertically; mutates actions with React refs | Keep compact track strips and note colors; use immutable note IDs and derived geometry |
| tracks/TrackAction.jsx | Positions blocks by time/duration, changes intensity through imperative refs | Replace with viewport-based rendering and clock-derived highlighting |
| tracks/TrackMidiClockEvents.jsx | Tempo segments with BPM labels | Keep; calculate BPM as 60,000,000 / microseconds_per_quarter |
| tracks/TrackZoom.jsx | Logarithmic horizontal zoom using react-slider and fixed screen coordinates | Rebuild with native range control, fit-to-view and local viewport dimensions |
| tracks/TrackTimeSignatureEvents.jsx, TrackPedalEvents.jsx | Placeholder text | Implement from retained metadata and channel sustain events |
| tracks/sidebars/SidebarNoteEvents.jsx | Placeholder text; no instrument controls | Replace with actual track/channel details and mixer controls |
| Other sidebars | Tempo polling through MAIN_APP; time-signature/pedal placeholders | Derive display from the current song and playback position |
| viewers/ViewerHarmonies.jsx, ViewerCode.jsx | Chord visualization and JSON dump | Leave out of the first interface port |
| AppHeader.jsx, AppModules.jsx, files/ | Legacy shell/modules and incomplete file abstractions | Keep the current transport and file-loading flow |

Do not copy legacy fixed top/left/85% positioning, refs embedded into events,
JSX stored in state, or uncleaned polling timers. The legacy note display is a
compact time strip, not a pitch-scaled piano roll; preserve that first. A true
piano roll can be a later detail view.

## Existing foundations and gaps

The current song already has track names/indices, channel/pitch/velocity,
program at note-on, key release and sustain-adjusted end times, and tempo
changes. Playback position comes from the audio clock. MIDI parsing, sample
caching, independent voices and Stop/unmount cleanup have automated coverage.

Before step 1, the hook did not expose the loaded song and the model discarded
instrument names, meter, raw pedal/controller transitions and program history.
These gaps are now addressed by MidiMetadata, MidiDisplayModel and the hook. Tracks and MIDI channels are
not interchangeable: a track can contain several channels, and several tracks
can share one channel. Add display/routing metadata without changing the
channel-scoped timing and sustain rules already verified.

## Step 1 — Expand the song and display model (complete)

- Retain track/instrument names, absolute ticks on notes, time signatures,
  pedal transitions and program changes, with track/channel provenance and
  seconds calculated from the same tempo map as note playback.
- Preserve stable note IDs and derive rows by track, with channel subrows when
  needed. Keep metadata-only tracks available as conductor information rather
  than empty instrument strips. Include note count, pitch range, channel list
  and observed programs in a pure display-model helper.
- Expose the immutable loaded song through useMidiPlayer; keep transport
  snapshots small so progress polling does not rebuild/copy the song.
- Retain key-release versus sustained-end distinction for note lengths and
  pedal shading. Carry the default tempo and meter into the display when
  explicit events are absent; make inferred meter visibly distinct if needed.

Deliverable: a tested, React-independent display model that preserves the
existing timing/playback contract, including format 0 multi-channel files.

## Step 2 — Build the track viewer inside All Music (complete)

- Keep Open MIDI/Play/Stop and messages at the top. Add a track section below
  them, with a timeline ruler, compact note strips and a sticky details column.
- Let the All Music layout own available dimensions. Use a single scrolling
  coordinate system with sticky row headers to keep labels aligned with notes;
  avoid independently scrolled sidebars and document-wide positioning.
- Add horizontal zoom, fit-to-view and row selection. Use bounded pixels per
  second, anchor zoom near the cursor/viewport center, and clamp scroll ranges.
- Render visible notes only, using canvas or a bounded SVG/DOM viewport. Keep
  minimum readable row heights for many tracks; do not divide a fixed height
  by track count as the old code does. Provide an accessible track summary and
  keyboard-operable controls alongside graphical content.
- Add labels to GamesText.jsx and styles beside the music feature. No old
  react-slider, icon framework, app shell or MAIN_APP dependency is necessary.

Deliverable: track display, zoom and synchronized labels for a loaded song,
without altering audible playback.

## Step 3 — Synchronize the display with playback (complete)

- Draw one playhead from controller position. Highlight notes using immutable
  IDs and start/key-release/end times, with sustain shown separately from held
  keys. Audio scheduling remains the sole timing authority.
- Reuse the hook's status/position subscription; optionally use one animation
  frame loop for the playhead while playing, with cleanup on Stop/unmount.
  Never create per-note timers or call React components from the audio engine.
- Add a follow-playhead toggle. Respect manual scrolling while follow is off;
  use the visible pane width rather than a hard-coded screen offset.
- Draw tempo, meter and channel pedal lanes from the retained event timelines.
  Handle constant tempo, missing meter, empty lanes and simultaneous events.
- Reset selection/zoom appropriately for a new file. Stop resets the playhead;
  completion preserves its final position; no seeking or note editing is
  implied by clicking the timeline in this first pass.

Deliverable: a responsive, accurate read-only track interface during playback.

## Step 4 — Add working track/channel mixer controls (complete)

- Add mute, solo, volume and pan to the row details. Use route keys containing
  both track and channel; label channels 1–16 in the UI while keeping 0–15 in
  the model. Shared imported channel state must not leak user row overrides.
- Define solo semantics explicitly: when any route is soloed, only soloed,
  unmuted routes sound. Allow reset to original mix and reset all overrides on
  file replacement. Keep per-song overrides in page/controller state, not in
  the parsed MIDI or persistent browser preferences keyed by filename.
- Insert route gain/pan buses between independent voices and the master.
  Apply live mute/solo/gain/pan to active and already-scheduled voices as well
  as new voices, with short gain ramps to avoid clicks. Prepare supported
  routes before Play so unmuting does not require an unexpected download.
- Separate source velocity/keyboard pan, imported channel automation and user
  mix overrides. Do not apply CC7/CC10/CC11 twice or present ignored controller
  data as an effective mix. Add automation support only with explicit tests.
- Preserve current errors for unsupported audio routes; do not silently omit
  percussion or unsupported pitches when adding mixer controls. Stop/dispose
  must disconnect route buses as well as voices and the master.

Deliverable: mixer controls with audible, tested effects, not placeholder UI.

## Step 5 — Add instrument assignment with honest sound support

- Show the file's original instrument/program history separately from the
  effective playback instrument. MIDI programs can change mid-track, and the
  displayed name must not imply a sound that the engine cannot produce.
- Introduce a small instrument registry/provider boundary around sample
  selection, supported pitch range, envelope and cache identity. GrandB piano
  is the first provider. Keep default playback behavior unchanged.
- Inspect available instrument assets and verify URLs, CORS, decodability,
  coverage and redistribution terms before enabling further sound choices.
  A General MIDI name table alone is insufficient to add instrument playback.
  This discovery can happen independently while the viewer is implemented.
- Offer original assignment versus user override per route only when the
  provider can honor it. Until other providers exist, show original program
  metadata with an explicit effective Piano label; do not show a functioning
  128-instrument selector that still plays piano for every option.
- For the initial implementation, changing an instrument during playback
  stops the song, invalidates old preparation and requires Play again. Include
  instrument identity in cache keys and prevent stale fetch/decode completion
  from restarting the previous assignment. Keep percussion unavailable until
  an actual percussion provider is verified.

Deliverable: an extensible, truthful instrument panel. Additional instruments
are enabled only after their sound source is verified; this does not block
shipping the track viewer and piano mixer first.

## Step 6 — Validate and document

- Unit-test display grouping and geometry, zoom bounds, tempo/meter/pedal
  positions, program changes, shared channels, empty tracks, format 0 and
  mixed-channel tracks. Keep existing timing/sustain tests unchanged.
- Test mixer routing, multiple solo states, immediate live mute/volume/pan,
  unsupported routes, reset-on-replacement, and Stop/unmount during sample
  or instrument preparation. Assert active/scheduled voices and route nodes
  are disconnected and stale work cannot change the new song.
- Extend the existing real-browser PCM capture harness: verify muted/soloed
  route energy, stereo balance, active-note highlighting, playhead accuracy,
  zoom/scroll behavior, file replacement and StrictMode unmount cleanup.
- Check long MIDI files and many-track fixtures for bounded rendering work
  and responsive interaction. Do not send file bytes or filenames to a server.
- Run MIDI tests, targeted lint and production build; record browser results
  and update music/README.md and the verification report.

Recommended delivery order: steps 1–3 for the visual port, step 4 for mixing,
then step 5 for instrument assignment as sound sources become available.
Step 6 validation accompanies each increment, with final end-to-end capture.

Step 1 validation: seven display-model tests join the existing MIDI suites.
All 190 legacy files match the committed player exactly for note timing and
song duration, with unique IDs and no lost notes in display grouping. See
music/README.md for the API and immutability contract.

Step 2 adds pane-local track/channel strips with sticky labels, a seconds ruler,
zoom/fit, selection summaries and bounded canvas rendering. Browser checks
cover narrow panes, zoomed scrolling, 64 tracks, 10,000 notes, and replacement
reset. See music/README.md for module responsibilities.

Step 3 adds one audio-clock playhead, separate held/sustained highlight overlays,
follow on/off, and synchronized tempo/meter/channel-pedal lanes. Unit tests
cover clock cleanup and boundaries; the browser checks real playback timing,
follow/manual scroll, state transitions and Stop/replay/completion cleanup.

Step 4 implements per-route mute, multi-solo, volume and pan through live
audio buses. Reset applies player defaults; original MIDI volume/expression/pan
automation remains metadata and is explicitly not applied. Real browser audio
checks verify silence, stereo isolation, reset and independent shared-channel
tracks. Instrument assignment remains step 5.

Step 5 implements the verified provider registry and per-route assignment panel. Original MIDI is selectable only for supported programs/banks; GrandB is the sole verified source. Changes stop and cancel playback preparation. Further timbres await source verification. See music/README.md.


Step 6 automated validation: 79 MIDI tests, targeted lint, production build and
browser harness compilation pass. Corpus comparison against the committed player
passes for all 190 files / 621,307 notes / 1,285 display routes. Additional lifecycle
tests cover completion, stale callbacks and 20 combined mix/assignment/replacement
cycles. The expanded browser harness adds audio-context suspension and resource
accounting. Its fixture has longer observation windows without relaxing the
120ms clock accuracy limit. Execution remains pending: the browser tool reports
local browser use disabled, including after the user enabled it and reconnection
was attempted. Earlier browser results remain historical evidence, not a final
pass for the revised harness. See MIDI_VERIFICATION.md.
