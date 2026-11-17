# FluidR3 GM v1

Coordinated local tag: `release/fluidr3-gm-v1` in fracto-ui and fracto-asset-server.
All Music now fixes its library to FluidR3 and uses original MIDI program
assignments. The library selector and refresh button have been removed; reload
the page to rediscover the catalog. Discovery failure does not switch to Legacy.
Legacy providers and explicit GrandB route overrides remain implemented. The
shared library-switching API still stops playback and retains mixer settings and
compatible overrides. Unsupported keys, banks and percussion remain unavailable.

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
