# FluidR3 GM v1

Coordinated local tag: `release/fluidr3-gm-v1` in fracto-ui and fracto-asset-server.
All Music defaults to FluidR3 and original MIDI program assignments; Legacy remains
selectable. Initial Play waits for catalog discovery; failure retains GrandB.
Library switches stop playback, retain mixer settings/compatible overrides, and
require explicit Play. Missing keys, banks and percussion remain unavailable.

The service owns audio. Deploy its matching catalog, indexes and ignored original/
playback asset directories before this UI. Git alone does not include sound data.
See the asset-server `instruments/fluidr3-gm/RELEASE.md` for installation,
source attribution, complete limits, validation and rollback instructions;
`NOTICE.md` and supplied upstream notices accompany redistributed sample assets.

Validation: 117 MIDI tests, production build, targeted lint, and native Chromium
48 kHz default-library audio/lifecycle regression. The browser report is
`test/midi_reports/fluidr3-default-library.json`; cleanup finishes with no open
contexts, connected product nodes, pending timers/frames or source callbacks.
See the service `release-validation.json` for final catalog and evidence hashes.
