# MIDI playback modules

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

The returned song contains `format`, `ppq`, `tracks` (index/name/end_tick),
`notes`, `tempos`, `duration_seconds` and structured `warnings`. Notes retain
track, zero-based channel, pitch, velocity, program at note-on, start_seconds,
key_release_seconds and end_seconds. End excludes the audio release envelope;
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

`useMidiPlayer.js` owns one controller per mounted panel, updates status from
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
