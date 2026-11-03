# FluidR3 percussion v1

Coordinated local tag: `release/fluidr3-percussion-v1` in fracto-ui and
fracto-asset-server. Standard drum kit playback and assignment are now available
on channel 10 when FluidR3 GM is selected. Other audited kits remain disabled;
unsupported notes/banks/programs do not silently substitute another sound.

Select a percussion strip for the Drum kit control. Original follows the file;
a manual kit override replaces its kit program/bank while preserving drum note
identities. Kit changes stop playback, retain mix settings and require Play.
Compatible explicit overrides survive library switches and catalog refreshes.
Pitched tracks retain melodic Instrument controls.

Playback preserves finite one-shot tails and uses audio-clock choke groups.
Rapid repeated hits cannot revive an earlier choke fade. Stop, replacement,
source changes and unmount cancel active/future sources; natural completion
waits for tails. See [kit controls](KIT_ASSIGNMENT.md) and asset-server
`instruments/fluidr3-percussion/RELEASE.md` for source/renderer pins, attribution,
installation, limits and rollback. Git excludes audio and source/renderer caches;
deploy the matching 23 Standard WAVs and manifest before the catalog and UI.
Python and FluidSynth are offline import tools, never runtime dependencies.

Validation: 135 MIDI tests, 38 server tests, 38 Python tests, production UI build
and targeted lint pass. Existing build chunk-size advisory remains. Final native
Chromium evidence in `test/midi_reports/percussion-release/` covers 536 bounded
hit cases at 48/44.1 kHz, all 7,747 production velocity lookups, tails/choking,
Stop/replay/completion, kit assignment UI and complete melodic playback
regression. All lifecycle probes finish with zero tracked resources.

The local tags mark coordinated commits; this release does not push or deploy.
Asset-server `release-validation.json` binds catalog/pins and evidence hashes,
and records both pre-release commits for a coordinated rollback.
