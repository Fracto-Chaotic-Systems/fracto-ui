# MIDI playback modules

## Bounded sample allocation (2026-11-15)

The default 256 MiB managed sample budget is retained. `MidiSampleSession.js`
resolves buffer-free note descriptors and chooses whole-song preloading only
when decoded assets plus temporary byte storage fit. Larger sample sets use a
five-second prefetch window that shrinks toward the scheduler horizon when
necessary. Scheduled/active voices pin their assets through sustain, release,
and percussion tails; unneeded, unpinned cache entries are removed. The song's
note array does not retain AudioBuffer references after eviction.

`MidiSampleBudget.js` owns a lifetime-wide gate for two concurrent loads/decodes.
Reservations include estimated decoded data and two copies of bounded encoded
data (stream chunks plus concatenation). `MidiSampleLoader.js` bounds downloads,
checks integrity and decoded shape, then transfers reservations to resident
bytes synchronously. Cancelled or timed-out native decode work retains its slot
until it actually settles, including across cache clear, Stop and replay. These
are managed sample allocations; browser/driver overhead and garbage collection
are outside the budget and are not a browser-process RAM guarantee.

GrandB's verified approximately 10.033-second mono MP3s reserve 10.1 seconds at
the actual AudioContext rate instead of estimating zero bytes. The UI labels an
GrandB choice as **GrandB piano (Legacy)** even when FluidR3 is selected.
**Original MIDI assignment** maps standard-bank GM program 0 (Acoustic Grand
Piano) to GrandB, including notes after program changes. Other programs continue
to use the selected library, and explicit route overrides use the chosen source.
Percussion and nonstandard banks are excluded from this substitution; pitches
outside GrandB's verified range remain unavailable. File metadata and memory
limits are unchanged. The left-column name reflects the effective GrandB source.

`MidiScheduler.js` obtains a pinned buffer immediately before scheduling a voice.
If a needed buffer is not ready, the `buffering` state suspends AudioContext time
and existing source offsets until preparation finishes; it does not advance the
note index or skip a note because of sample loading. Stop aborts the session and
prevents a late preparation from resuming playback. Existing release/tail and
audio-clock timing behavior is preserved. Playback snapshots expose allocation
and scheduling counters for verification, without adding technical UI controls.

The Hammerklavier fixture is 74,228 bytes, 8,290 notes, and 593.4006 seconds.
Before the GrandB substitution, the FluidR3 rendition needed seven assets
(48.83 MiB decoded at 48 kHz). GrandB needs 189 assets overall and uses windowed
loading, including when selected by original Acoustic Grand Piano assignments.
See `test/midi_browser/README.md` (from the UI root)
for the repeatable full-duration native browser test. The MIDI input remains
outside Git; reports identify it by SHA-256.

## Fixed All Music library: FluidR3 GM

`useMidiPlayer.js` fixes All Music to `SOUND_LIBRARY_ID = "fluidr3-gm"`
for both its initial registry and every discovered catalog, independent of the
catalog default. The Sound library selector, Refresh libraries button and
library-switching help are no longer rendered. Catalog discovery runs on mount;
reload the page to fetch an updated catalog. Discovery failure reports catalog
unavailability without automatically substituting Legacy piano. New files use
Original MIDI assignment; manual route overrides reset on replacement.

Shared Legacy providers, explicit GrandB route overrides, library-switching APIs
and catalog-refresh code remain implemented. Audio assets, gain and memory
limits are unchanged. The migration reports below describe historical behavior.

## Historical default: FluidR3 GM (migration step 6)

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

`MidiSampleCache.js` loads a session's distinct required sample URLs with two
concurrent fetch/decode jobs and a 256 MiB managed sample budget. Catalog sample
requests retain their declared credentials; external GrandB requests omit them.
The session controls full-song versus bounded-window loading as described above.
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

The track listing begins with its toolbar; the visible Tracks heading and
track/channel count summary are omitted. The section retains its accessible name.
The held-key, sustained-key and sustain-tail legend is also omitted above the listing.

Note rows display their effective instrument (or drum kit) in the sticky left
column. Row headers use a light, low-contrast grey gradient, brightest at the
upper left, suggesting soft illumination. This background sits in a separate
layer so text and controls retain their normal colors. Selected rows retain
the gradient beneath a subtle blue tint and selection stripe.
Instrument names are preceded by a bold, circled MIDI channel number (1–16)
on the top line.
Rows on the same channel share its number. Sustain rows also show the circled
channel number and sit directly beneath each affected instrument row. Sustain
is channel-wide, so tracks sharing a channel each show that channel's sustain
lane; channels without pedal events get no empty lane. Pedal-only channels
without an instrument row remain at the end. Tempo and meter stay at the top.
The redundant channel-and-note-count text line is omitted from each row;
note counts remain available in row tooltips.
`MidiTrackInstrumentLabel.jsx` switches the name to an inline selector
on click or keyboard activation and highlights that route. Changes
use the existing assignment API, stopping playback and retaining mix settings.
The selector returns to the name after a change, blur or Escape. Choices use
the registry's verified coverage rules; original MIDI assignment remains available,
and routes with program changes list all effective instruments. Metadata/event
lanes retain their labels. File track names remain in row tooltips.
Each note row also has Mute and Solo checkboxes plus volume and pan sliders in
the left column, with italic, lowercase mute/solo labels and the first checkbox aligned under the instrument name
after the channel badge. They are wired to the existing live route mix state by
`MidiTrackMixControls.jsx`. Slider caps contain regular-weight white `V` and `P` letters
with a subtle dark text shadow
instead of separate volume/pan labels. The sliders share an identical width and
begin at the checkbox's left edge with a 24px inset, without visible readouts.
`MidiFader.jsx` styles the native range inputs as light recessed mixer slots
with a dark upper edge suggesting shadow, plus
scale ticks and flat, darker rectangular caps, preserving keyboard and pointer
interaction plus visible keyboard focus. Both faders retain the same dimensions.
Cap letters use inline SVG backgrounds on the native thumb in both Chromium and
Firefox, so the lettering follows the cap without a separate positioning layer.
The pan fader has a distinct center tick and an accented cap at exactly zero,
making centered pan visible even when the cap covers the tick.
Volume retains its full accessible name, and both sliders expose their current
values to assistive technology. These controls are separate from the instrument button, so adjusting
them does not open its selector. Instrument rows are 80px tall and sustain rows
are 30px tall, with italic, lowercase pedal state beside the Sustain title and
circled channel number. Tempo and time signature rows share that 30px height,
with italic current values beside their titles and vertically centered headers.
Tempo/meter titles and values use full-height flex boxes with a shared line-height
so their differing font sizes do not shift their vertical alignment.
`track_row_layout` owns cumulative positions and heights for
virtualization, labels and timeline canvases, keeping mixed-height rows aligned.
A 2px groove divider, dark on top and light below, spans the listing after each channel group; the instrument
and its sustain lane retain their light internal separator. Group boundaries
are calculated before virtualization, including channels without a sustain lane.
The same divider separates tempo from meter and the timing rows from instrument
tracks below them.
A matching groove also runs above the Tempo row.
The Tempo header cell paints its own top groove so it remains visible when
the header stays fixed during horizontal scrolling.
The Track/channel ruler corner also has a bottom groove and is constrained to
the ruler height, preventing its padding from overlapping the Tempo header.
The header/timeline boundary uses a matching 2px vertical groove, dark on the
left and light on the right, continuing through the ruler corner and selected rows.
There is no selected-track details text or mixer panel below the listing.
The older `MidiTrackMixer.jsx` and
`MidiInstrumentAssignment.jsx` component is retained but is no longer rendered.

`../GamesMusic.jsx` renders Open MIDI, Play and Stop with filename, elapsed /
total time, live status, errors and warnings. `MusicStyles.jsx` owns its local
layout. The filename (or no-file placeholder) shares the transport button row,
with long names wrapping within the remaining space. The transport buttons
appear without an introductory help paragraph.
Embedded markers, text, copyright notices and cue points are shown as plain text
below the transport row, aligned under Open MIDI, as a single line separated by
middle dots that wraps to the available width. The first visible entry is bold;
the remaining entries are italic. Blank entries are hidden;
files without these events show no metadata block. The parsed song retains each
entry's type, track, tick and time in `text_events`; names are not interpreted as
performer or creator credits. File replacement clears the previous file's text.
Text is registered in GamesText.jsx under MUSIC_TEXT; internal engine
errors are mapped to those strings rather than exposing raw exception text.
Open supports local .mid/.midi files; selecting the same file again works.
After a successful import, `MidiRecentFile.js` stores just the latest filename
and MIDI bytes in this browser origin's IndexedDB (bounded by the 8 MiB import
limit). Opening All Music again, including after refresh, restores that local
copy without starting playback. It does not reread the original disk path or
upload the file. Browser storage may be unavailable or cleared; in that case
the page opens normally without a saved file. Failed imports do not replace the
last successfully opened file. A new file selection or Stop cancels a pending
restore, and StrictMode/unmount cleanup prevents stale restores.
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
SHA-256 before decoding. `MidiSampleHash.js` uses Web Crypto when available and
the pinned `@noble/hashes` SHA-256 implementation on LAN HTTP origins. The fallback
hashes every byte in 1 MiB updates, yielding between updates and respecting sample
loading cancellation; checksum or size mismatches still fail before decoding.
See the [upstream implementation](https://github.com/paulmillr/noble-hashes).
Shared chunks
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


## Multiple library identities

`MidiCatalogLibraries.js` validates an additive schema-1 extension mirrored by
asset-server instruments/catalog-libraries.js. Older catalogs normalize to legacy;
explicit catalogs carry libraries, default_library_id and per-instrument
library_id/instrument_key. Current providers retain IDs; new libraries qualify
instrument IDs to isolate cache entries and original-program mappings. Original
lookup is scoped to the default library, while explicit provider overrides remain
available. Default-library changes participate in registry identity; display-only
refreshes publish current metadata without restarting sound.

Limits are 16 libraries, 2,048 instruments and a bounded 32 MiB streamed response.
Audio memory budgets are unchanged. FluidR3 now supplies 128 prepared, disabled instruments using the existing
bounded mono provider contract. Native checks and UI library selection follow.
See the asset server's instruments/MULTI_LIBRARY.md for the contract. Verification:
109 MIDI tests, 25 server tests, targeted lint, production build and real HTTP/
engine probes pass. Existing 21 sources and all audio mappings are unchanged.


FluidR3 step 4 native checks pass for every usable note (10,648) and chunk (1,099),
with seven representative real-time lifecycle checks and A/B captures. All 128
providers are playback_verified but remain disabled until library selection is
connected. See asset-server instruments/fluidr3-gm/VERIFICATION.md for scope,
measured duration/level differences and reproducible commands.

Catalog discovery now compares effective assigned-source cache keys before
interrupting loading/playback; unrelated new providers do not stop the current
S3 piano. Assigned-source changes still stop and require explicit replay. This
fix is covered during both preparation and active playback (111 MIDI tests).


## Historical FluidR3 library selection (migration step 5)

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
Step 6 browser regression passed. Play waits for first catalog discovery to settle, avoiding fallback playback being interrupted when the default arrives. Failed discovery leaves fallback playback available.
Sample preparation now reports completed/required chunk counts. Each download/body-read/integrity/decode operation has a 60-second chunk deadline; audio-context resume has a 15-second deadline. Timeouts leave Loading with a retryable error. Stop settles pending preparation even when the underlying browser promise ignores abort; late work cannot schedule voices or populate the cache.


Percussion step 2: catalog discovery validates the separate audited drum-kit inventory and SF2 library metadata. It does not create percussion providers or alter melodic program lookup. Kit playback and UI assignment follow asset preparation and native verification. See asset-server instruments/DRUM_KITS.md.


Percussion step 3: discovery validates `assets_prepared` kit hit windows without creating providers. Prepared kit URLs are available for the next verification step; kit availability/selection remains disabled. See asset-server instruments/fluidr3-percussion/IMPORT.md for the pinned offline renderer and velocity policy.

## Percussion playback — step 5

The verified Standard kit now resolves through FluidR3 GM's explicit percussion
library link for channel 10, standard bank and program 0. Other kits, unsupported
notes and nonstandard banks remain unavailable. Percussion providers never
replace pitched programs, and SF2 kit libraries cannot be selected as melodic
libraries. Kit assignment UI follows in step 6.

`MidiDrumKit.js` converts validated hit windows to authenticated, checksum-bound
sample descriptors with per-interval velocity gain and exclusive classes.
`MidiVoice.js` preserves finite one-shot tails independently of key releases or
sustain. `MidiScheduler.js` chokes earlier class members across tracks on the
same kit/channel, using a 5 ms fade at the incoming hit's audio time. Stable
MIDI event order determines simultaneous class members. Stop/reload/dispose
cancel active and future hits; natural completion waits for all drum tails.

Validation: 132 MIDI, 38 server and 38 Python tests; production build and targeted
lint pass. Native browser production-path checks cover short note-offs, all
7,747 Standard note/velocity mappings, polyphony, cross-track hi-hat choking,
silent Stop, cached replay, natural completion and complete cleanup. The
existing melodic browser playback regression also passes. See
`test/midi_reports/percussion-playback.json` and asset-server
`instruments/fluidr3-percussion/PLAYBACK.md` for scope and deployment details.

Percussion step 6 adds [kit assignment controls](KIT_ASSIGNMENT.md) to channel 10 strips, with linked kit inventory, exact coverage gates, effective names, explicit overrides and preserved stop/refresh behavior.

Percussion step 7: [release/install/rollback](PERCUSSION_RELEASE.md), coordinated local tag release/fluidr3-percussion-v1. Final validation includes the rapid-roll choke regression.
