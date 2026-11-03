# All Music drum kit assignment

Select a channel 10 track strip to open its playback mix controls. Its assignment
selector is labeled **Drum kit** and lists **Original MIDI assignment** plus the
kits belonging to the selected melodic library's percussion source. Pitched
tracks keep their Instrument selector; kit providers never appear there.

With FluidR3 GM selected, Standard is the only enabled kit. The other 30 audited
kits are listed disabled with Audio unavailable or Not enabled for playback,
according to their asset state. A kit with incomplete track note/velocity
coverage is disabled with Unsupported notes on this track. Inventory metadata
alone cannot enable assignment.

Original follows every file kit program and bank. An explicit kit override
replaces those assignments for this track/channel strip and preserves each
drum note identity. The selected kit must support every note. File metadata and
program history remain visible and unchanged; unsupported original assignments
are marked unavailable. Playback sound shows the effective kit name.

Changing assignment stops playback and requires Play again. Mix settings are
retained. Compatible explicit overrides survive library switches and catalog
refreshes, with a library-qualified name when outside the current library's
kit source. Removed or incompatible providers revert to Original, which may
remain unavailable; no automatic kit fallback is applied. Opening another file
resets assignments. Percussion defaults to Original even before catalog loading,
so a missing catalog never silently assigns a piano.

The assignment label wraps above the select when space is narrow, keeping both
the label and long unavailable-kit names inside the mix panel.

Validation: 134 MIDI tests, targeted lint and production build pass (existing
chunk-size advisory). Native Chromium checks in
`test/midi_browser/KitAssignmentChecks.js` exercise the actual All Music controls:
32 options, one selectable kit, original/manual playback, captured audio,
silent assignment changes, preserved mix, explicit Play, library switching,
catalog refresh, unsupported-bank/program override, unsupported-note rejection
and unmount cleanup. Evidence: `test/midi_reports/kit-assignment.json`.
The existing full melodic playback browser regression is also recorded as
`test/midi_reports/kit-assignment-midi-regression.json`.
