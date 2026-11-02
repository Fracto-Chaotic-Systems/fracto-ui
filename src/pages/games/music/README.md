# MIDI playback modules

Current playback status (2026-11-02): **all 21 instruments are enabled** after
75 native Chromium decode/render probes (low/middle/high pitches of every
recording layer) passed through the sample cache and voice engine at 48 kHz.
The catalog marks them playback_verified; detailed evidence is recorded in
browser-verification.json in the asset-server instruments directory. Earlier
disabled/pending statements below describe the initial migration stages.
Native probes confirm signal output, not a subjective listening review.
Reload All Music to fetch the updated catalog. A source can still be disabled
for a track containing notes outside that instrument's verified pitch range.


Current migration results and setup: [ASSET_MIGRATION.md](ASSET_MIGRATION.md).
Earlier step reports below are historical; final browser verification now passes.

`MidiEvents.js` exposes `events_from_midi(ArrayBuffer | Uint8Array)` and
`MidiFileError`, without React, audio devices, network requests or UI state.
`MidiValidation.js` bounds input before calling the legacy parser (8 MiB,
256 tracks, 200,000 events), checks chunk/payload boundaries, four-byte VLQs,
channel data, supported formats 0/1 PPQ, metadata lengths and end-of-track.
It rejects unsupported system messages, SMPTE and format 2. Bytes after all
declared complete tracks are excluded from parsing with a
`trailing_bytes_ignored` warning; several legacy exports append eight junk bytes.
`MidiEvents.js` applies the unknown-metadata/SysEx skip hook synchronously and
restores the previous parser hook, then checks output against validated counts.
`MidiTimeline.js` owns timing, note pairing and channel controller state.

The returned song contains `format`, `ppq`, `tracks` (index/name/instrument_name/end_tick),
`notes`, `tempos`, `duration_seconds`, display metadata and structured `warnings`. Notes retain
stable file-scoped `id`, track, zero-based channel, pitch, velocity, program at note-on, start_seconds,
key_release_seconds and end_seconds, plus start_tick/key_release_tick/end_tick.
End excludes the audio release envelope;
song duration includes trailing track silence. Empty note files throw an error.
Tempo defaults to 500,000 microseconds/quarter; tempo changes from every track
apply after reaching their tick. Ties use track index then original event order,
preserving authored order within a track. Same-channel state spans tracks.

Overlapping same-channel/pitch note-ons pair FIFO. Sustain is channel-local
(CC64 >= 64); key releases remain audible until pedal-up. Retriggering a pitch
does not discard previous sustained voices. CC120 ends all channel voices,
CC123 releases held keys respecting sustain, CC121 resets sustain. Unmatched
note-offs are counted and ignored. Unfinished/sustained notes close at global
song end with a warning. Out-of-piano-range pitches and percussion notes are
preserved with warnings, for the future audio layer to handle explicitly.
Other controllers, pitch bend and instrument rendering are not implemented.
Warning codes are internal data; the future UI must localize their messages.

Structural bounds prevent malformed parser loops; these synchronous modules
should be called from a worker when wired to the UI if large imports affect
responsiveness. The event-preparation modules do not schedule playback or load piano samples.


## Audio controller

`MidiPlaybackController.js` exposes `load(bytes)`, `play()`, `stop()`,
`dispose()` and `snapshot()`. Construct it per music page instance with an
`on_status(snapshot)` callback; store the controller outside React state.
`load` synchronously returns the parsed song or throws `MidiFileError`.
It first stops the old song; an invalid replacement clears it. Loading bytes
never creates an audio device or starts a network request.
Call `play` directly from the Play gesture. It lazily creates/resumes one
AudioContext and master gain, prepares samples, and starts the scheduler.
It resolves true on start or false on cancellation/failure/duplicate Play;
failures are reported through status, not unhandled promise rejections.
Statuses are idle, ready, loading, playing, stopped, completed, error and
finally disposed. Snapshots include code/message errors, warnings, duration
and current audio-clock position. Poll snapshot for progress if needed; status
callbacks run on state changes, not every scheduling tick. Localize error and
warning codes when adding the UI; the modules' messages are diagnostic text.

`MidiScheduler.js` feeds a 150 ms horizon every 25 ms, with a 50 ms start
lead and a 512-note work limit per pump. It uses context time for note starts,
releases and sample offsets, never Date.now or a timeout per event. Each note
owns an independent source through `MidiVoice.js`, a short attack/release gain
and stereo pan. Voices are not assigned or matched by pitch. Late pumps skip
notes already released and start still-active notes at the elapsed sample
offset, preserving their original end time. Background-tab timer throttling
can still cause missed notes; an AudioWorklet scheduler is outside this pass.
Natural completion waits for the last voice release and trailing song silence.

Stop immediately zeros master gain, aborts downloads, invalidates pending
resume/decode work, clears the scheduler timer and stops/disconnects all
current and future scheduled sources. It keeps the song and cache for replay
from zero. It never reconstructs/reconnects the master graph. File replacement
uses the same cancellation path. Dispose additionally releases the sample
cache, disconnects the master and closes the context; it is idempotent, returns
a promise, and suppresses later notifications. The page must call dispose on
unmount. Constructors accept context/fetch/timer functions for isolated tests.

## Piano samples

`MidiPianoSamples.js` retains legacy p/mp/mf/f velocity boundaries and remote
GrandB filenames. It defines gain, release and keyboard-position pan, without
React refs or color utilities. All pitched programs use the piano. Percussion
(channel 9) and pitches outside 21–108 currently fail playback explicitly;
they are not silently omitted or transposed.

`MidiSampleCache.js` preloads only the song's distinct sample URLs, with four
concurrent fetch/decode jobs, no credentials, and a 256 MiB decoded-cache cap.
Replay reuses buffers. Preparing another song prunes unneeded cached buffers;
failed samples can be retried. Memory-limit failures are explicit errors.
Stop does not close the context so a replay can reuse decoded buffers;
non-abortable decode results are discarded when their request is cancelled.
The sample root and fetch function can be supplied to the controller. No new
runtime package or copied audio asset is needed.

Samples play once, without invented loop points. Notes longer than their
sample produce `sample_shorter_than_note` warnings and decay naturally at the
sample end. End times exclude the extra release tail. Sample licensing and
coverage verification remain documented in ../MIDI_VERIFICATION.md.

## All Music page integration

`../GamesMusic.jsx` renders Open MIDI, Play and Stop with filename, elapsed /
total time, live status, errors and warnings. `MusicStyles.jsx` owns its local
layout. Text is registered in GamesText.jsx under MUSIC_TEXT; internal engine
errors are mapped to those strings rather than exposing raw exception text.
Open supports local .mid/.midi files; selecting the same file again works.
Play is enabled after parsing and disabled while reading/loading/playing.
Stop also cancels an in-progress file read or sample load; replay starts at zero.

`useMidiPlayer.js` exposes the immutable parsed `song` separately from its small
transport snapshot, owns one controller per mounted panel, updates status from
its callback and polls position every 200 ms only while playing. Unmount
suppresses callbacks, closes the context and invalidates pending reads through
the disposed controller. StrictMode cleanup/recreation is supported.
Import generation checks prevent an old read from replacing a newer file or
restarting after Stop. `unload()` clears the old song/cache before reading a
replacement, while keeping the context reusable. A failed replacement cannot
play the previous song. Browser file contents are never uploaded.

The file picker stays available during playback. A cancelled picker leaves
playback intact; selecting a replacement stops it immediately. Oversize,
malformed, unsupported and unreadable files show retry guidance. Sample/audio
failures keep Play available for retry; unsupported pitches/percussion require
another file. No pause, seek, cloud browsing, autoplay or saved file is added.


## Verification

Run `npm run test:midi` for timing, parsing, sample and lifecycle coverage.
The repeatable `test/midi_browser/` harness additionally runs the actual page
and file-read hook against browser Web Audio, records the same signal sent to
the output destination, and checks Stop/replacement silence and context closure.
See ../MIDI_VERIFICATION.md for measured results and the captured audio artifact.


## Track display metadata

`MidiMetadata.js` records metadata at the same absolute tick/second as note
preparation, avoiding a second tempo conversion path. Song arrays include
`track_names`, `instrument_names`, `time_signatures`, `pedal_events`,
`program_changes` and `controller_events`. Explicit events carry stable event
IDs, originating track/event index, channel (null for track-wide metadata),
absolute tick and seconds. Track name/instrument_name fields summarize the
last name; the timed arrays retain their full history. Names are track-scoped,
not inferred instrument assignments for every channel in a mixed track.

Tempo and meter arrays include marked `inferred: true` defaults at zero when
no explicit event establishes that value there: 500,000 microseconds/quarter
and 4/4. Explicit changes retain `inferred: false`; meter records denominator
and its original exponent, MIDI clocks per click and notated 32nds per quarter.
Raw controller history includes bank, gain, pan and expression data without
changing playback. Pedal events preserve every CC64 value; Reset Controllers
also records its inferred pedal-up when it releases a held channel pedal.
Program history remains channel-scoped even when authored on another track.
These values describe the file, not supported playback instruments or mixing.

`events_from_midi` freezes the completed song recursively after attaching all
warnings. Note IDs derive from originating track/event index and are stable
when reparsing the same file; they are scoped to that song, not globally unique
across files. Key-release and audible-end ticks use the same pairing, sustain,
controller-reset and song-end rules as the existing seconds fields.

`MidiDisplayModel.js` exposes `build_midi_display_model(song)`. It returns
immutable `tracks`, note-bearing `rows`, `conductor_tracks` (tracks without
notes, including empty tracks), and the event lanes above. Track summaries
include note_count, sounding channels, observed note programs and pitch_range
(null for tracks without notes). Each sounding `(track, channel)` route has a
stable ID, shared original note references and its own summary. This keeps a
format-0 multi-channel track distinct from several tracks sharing a channel.
The helper does not alter note timing or channel state. Call it once per new
song (or memoize by song reference), not on every progress tick.

The hook's song reference is null initially and during replacement/failed reads,
and remains stable during transport updates. Stop preserves a loaded song;
unmount disposes it. Progress snapshots never include the large song object.
The track viewer is now implemented; playback highlighting and mixer controls
remain subsequent steps.


## Track viewer

`MidiTrackViewer.jsx` is memoized by song identity and builds the display model
and per-route interval indexes once. It adds a seconds ruler and a strip for
each sounding `(track, channel)` route below the existing transport. Labels
show track names (or numbered fallbacks), one-based channels and note counts.
Selecting a label exposes pitch range, file program numbers and instrument
metadata; it does not seek, edit or alter playback. Conductor/empty tracks are
listed separately. All visible labels are in the MUSIC_TEXT catalog.

`MidiTrackStyles.jsx` keeps a single scroll viewport with sticky labels and a
sticky ruler. Every row has a 72px height, and the label/canvas cells share one
grid. Games.jsx gives the music pane its available height and owns the outer
vertical scrollbar, so many-track content remains reachable on short screens.
The viewer fits inside the music panel and supports keyboard scrolling,
range-slider zoom, label selection and Fit to view. Channels use subrows when
a track contains several of them; the timeline is a compact note overview,
not a full piano keyboard editor. Vertical position is relative pitch per row.

`useTrackViewport.js` measures the pane with ResizeObserver, owns scroll/zoom
and disconnects on unmount. Zoom is logarithmic from fitted width to 256x,
anchored at the visible center where boundaries permit. Fit returns to time
zero and adapts to pane resizing. `song_revision` in useMidiPlayer increments
on every successful load and keys the viewer so even a replacement with the
same filename resets zoom, selection and scroll. Stop preserves zoom and
selection; follow mode determines whether the view returns to the zero cursor.

`MidiTrackGeometry.js` owns the time/pixel transforms, ruler intervals,
interval-tree note queries and visible-row ranges. `MidiTrackCanvas.jsx`
paints viewport-sized canvases only for visible rows plus overscan. Small
passages retain individual pitch colors. Dense passages use an eight-lane
pixel-occupancy overview, keeping draw calls bounded without losing the
visible time coverage. Native labels and the selection summary expose note
counts, channels, pitches and programs without relying on canvas text alone.
No per-note React nodes, action refs, global screen offsets or old slider
package are introduced. Playback synchronization and tempo/meter/pedal lanes are implemented as
described below.


## Synchronized playback view

`useMidiTrackClock.js` runs one `start_track_clock` animation loop from
MidiTrackPlayback.js while playing, capped at 30 paints per second. Every
position is read using useMidiPlayer's stable get_snapshot callback; animation
frame timestamps only throttle painting. Controller snapshots include a
playback_id and clock_started flag, distinguishing a new replay from stale
frames and the 50ms scheduling lead-in from notes that have actually started.
There are no per-note timers or React refs in the audio model.

`MidiTrackBody.jsx` owns the virtual row composition and one clipped red
playhead overlay aligned to the same time/pixel transform as all lanes.
`MidiNoteHighlights.jsx` paints a separate transparent overlay for visible
note rows. The original static canvases remain cached during animation.
Held keys are blue; notes whose keys were released but remain held by sustain
are amber. Static pale tails show the key-release-to-sustain-end interval.
End boundaries are exclusive, so completion and Stop never retain highlights.
Highlights describe MIDI key/pedal state; they exclude the audio release tail.

Follow playhead defaults on for each new song. It scrolls horizontally only
when the cursor approaches a viewport edge; vertical browsing stays manual.
Turning follow off preserves manual horizontal scrolling. Stop resets the
cursor to zero, and follow-on returns the viewport there; completion preserves
the final position. Replay starts at zero without flashing the previous run's
cursor. The loop is cancelled on Stop, failure, completion, replay or unmount.

`build_track_event_lanes` derives tempo, meter and per-channel pedal lanes from
the immutable song. `MidiEventLane.jsx` paints their segments and displays the
current value at the playhead. BPM is 60,000,000 / microseconds_per_quarter;
tempo/meter defaults are marked, and an empty pedal lane is explicit. Pedal
intervals respect channel sharing across tracks, repeated pedal-down messages,
Reset Controllers release, and a pedal held until song end. Playback and
follow updates do not reconstruct the event timelines or static note indexes.

Synchronization remains read-only: it does not seek or edit notes. Separate
playback mixer overrides are now implemented as described below; instrument
assignment remains a later step.


## Track/channel mixer

Select a track/channel label to open `MidiTrackMixer.jsx`. Mute and Solo are
native checkboxes, Volume ranges from 0–100% (unity at 100%), and Pan ranges
from full left to full right with Center preserving the source stereo image.
Controls work before Play, during preparation and while notes are sounding.
Reset mix restores every route to unmuted, not soloed, unity volume and center.
Muted or solo-excluded strips dim; labels expose the status accessibly.

`MidiMixer.js` owns immutable per-song overrides keyed by the same `(track,
channel)` IDs as the viewer. Tracks sharing a MIDI channel remain independent
mixer routes; imported MIDI channel state and note pairing remain unchanged.
When any route is soloed, only soloed routes are audible; explicit Mute always
wins, including a muted solo. Multiple routes may be soloed at once. The
frozen parsed song never receives mixer edits, and no filename-keyed settings
are persisted. Settings survive Stop/replay but reset on every file load,
unload or invalid replacement. The hook publishes mix changes separately from
small progress snapshots, so animation does not copy the mixer state.

On Play the controller prepares all supported song samples, then connects one
gain/pan bus per route between the independent voices and the master output.
The scheduler resolves each note's destination by track and channel. Existing
and future scheduled voices pass through that same bus, allowing a muted held
note to become audible again without restarting its source or downloading.
Live gain and pan changes use 12ms ramps with automation held/cancelled at the
current audio time. Source velocity gain and keyboard pan remain in the voice;
route gain/pan is an additional playback adjustment, applied once.

Stop first mutes the master and stops sources, then disconnects every route
bus. Completion, errors, replacement and disposal also release buses. Replay
creates new buses from the retained settings, reuses decoded samples and keeps
one master graph. Late cancelled preparation cannot recreate old routes.

`MidiPlaybackController.set_mix(id, patch)` validates route membership,
accepts boolean mute/solo and finite clamped volume/pan values, and emits
on_mix with the new immutable state. reset_mix updates buses without stopping
playback. Imported CC7/CC10/CC11 automation is retained as file metadata but is
not rendered as a mix or applied to sound; the panel states this explicitly.
Reset mix means the player's defaults, not an unimplemented original MIDI mix.
The default override plays all pitched programs through GrandB piano. Muting unsupported percussion or
out-of-range notes does not bypass the existing sample validation errors.


## Instrument assignments

The selected track/channel panel separates file programs, banks, instrument
names and channel-wide program history from the effective playback sound.
`MidiInstruments.js` owns the verified provider catalog and note resolution;
`MidiInstrumentAssignments.js` owns immutable per-route, per-song choices.
Only the existing GrandB piano provider is enabled (pitches 21–108, no drums).
Original MIDI assignment is available only when every route note has a verified
standard-bank program mapping: currently program 1 (zero-based 0), bank 0:0.
Other programs can use the explicit GrandB override; unavailable original
assignments are disabled. Bank selects are retained on notes and program events.

Changing a valid assignment stops playback, aborts pending preparation and
requires an explicit Play. Mix settings survive, while replacement/unload resets
assignments to GrandB. No file metadata is mutated or settings persisted.
Decoded cache keys include provider ID, version and sample URL. Late aborted
fetch/decode work cannot populate the cache or restart old voices.

Adding a source requires a code-owned provider with a distinct ID/version,
verified pitch/velocity/program/bank coverage, browser decode and CORS checks,
and documented usage terms. Register it only after verification; provider labels
belong in MUSIC_TEXT. Tests inject synthetic providers solely to check cache
isolation and resolution, never to offer nonexistent sounds in the UI.
The S3 instrument directory listing returned 403 during discovery; no additional
sound source or redistribution rights were established, and no assets were copied.

Step 6 validation: 79 MIDI tests, targeted lint, production and harness builds pass; all 190 legacy files retain original note fields/timing and complete display grouping. Final expanded browser rendering/timing/mix/cleanup checks remain pending browser tool access; see ../MIDI_VERIFICATION.md.


## Asset-server engine connection (2026-11-02)

`MidiInstrumentCatalog.js` discovers `/instruments` using the runtime asset service
origin, session credentials, cancellation and an eight-second timeout. It preserves
production `/api/asset` proxy prefixes and accepts configured public audio URLs.
Only enabled, available entries become providers; prepared-source opt-in exists
solely for verification. GrandB remains the fallback. Library sources use `asset-`
provider IDs; no program mapping is inferred from instrument names. The instrument selector now consumes this runtime registry and inventory.

Catalog providers validate mono PCM16 octave assets, coverage, note boundaries,
versioned URLs and velocity layers. `MidiSampleAsset.js` verifies encoded size and
SHA-256 before decoding (Web Crypto requires HTTPS or localhost). Shared chunks
are fetched/decoded once, with credentials; legacy S3 requests omit credentials.
The cache estimates decoded memory at the actual context sample rate before
fetching and enforces its 256 MiB limit. Oversized songs fail explicitly.

Each voice starts at its pitch offset plus elapsed lateness, and passes an explicit
bounded duration to AudioBufferSourceNode.start. Sustained notes cannot continue
into the next pitch; samples do not loop. Replay reuses chunks. Stop, replacement,
failed preparation and disposal cancel work and discard late results. Catalog
refresh preserves mix/compatible assignments, clears stale provider caches and
stops playback only when provider identity changes. Discovery errors retain the
fallback and display a nonblocking message; discovery never opens audio devices.

Verification: 99 MIDI tests pass, targeted lint and production build pass. The
real-library HTTP probe resolves all 1,999 mappings across 21 entries. A visible
browser decoded one flute chunk at 48 kHz for four voices: captured RMS 0.03068,
exact silence after Stop and after the 7.87-second pitch boundary, replay and
natural completion, and zero remaining tracked resources after disposal.
All asset-server sources remain disabled; this single-source verification does
not certify every instrument or change the production selection gate.


## Catalog-backed instrument assignment (step 6)

The selected track/channel instrument menu receives the controller's live catalog
through the viewer and mixer. `MidiInstrumentChoices.js` derives labels, effective
sounds and coverage from that same registry. Catalog names render as ordinary
React text; no translated label key is required for remote providers. Inventory
entries absent from the playable registry remain visible as disabled choices,
with missing-audio or not-enabled explanations. Playable sources with incomplete
pitch/velocity coverage or incompatible percussion are also disabled. Original
MIDI assignment still requires explicit verified program/bank mappings.

GrandB remains the default, including discovery failures. Catalog refresh updates
options without reloading the MIDI file; existing controller rules retain compatible
assignments and mix settings, and reset removed assignments. Choosing a source
uses the controller's validation, stops playback and requires an explicit Play.
No inventory entry is enabled merely by appearing in the menu. All 21 prepared
asset-server sources remain disabled pending library verification/enablement.

Validation: 102 MIDI tests, targeted lint and production build pass. New choice
model tests cover runtime labels, inventory deduplication, availability, coverage,
percussion, fallback and effective/original assignments. Existing engine tests
cover source changes, registry refresh, mixing preservation and cancellation.
A rendered-browser check was attempted, but the browser tool reported
`browser.user is unavailable`; the updated selector was not browser-verified.
