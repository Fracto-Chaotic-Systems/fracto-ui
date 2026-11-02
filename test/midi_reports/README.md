# MIDI migration evidence

Dated snapshots from the 2026-11-02 verification run. These are historical results,
not runtime health checks. No production catalog source was enabled.

- page-browser.json: actual All Music controls, all 21 disabled catalog entries,
  rendering/timing/mixing, assignments, captured silence and cleanup.
- asset-engine-browser.json: native flute chunk decode/output at 48 kHz using
  test-only prepared-source opt-in; shared voices and bounded note output.
- asset-engine-http.json: actual API/WAV/checksum flow with deterministic
  clock and decoder stub; validates all 1,999 catalog mappings.

The browser captures measure the graph connected to AudioDestination, not
physical speakers. Audio recordings remain outside Git in the harness output
directory. Reproduction instructions: ../midi_browser/README.md and
../../src/pages/games/music/ASSET_MIGRATION.md.

Library enablement follow-up: library-browser.json records 75 passing native
offline decode/render probes across all 21 sources before enabling them. Earlier
JSON snapshots retain the then-disabled catalog state as historical evidence.


FluidR3 step 4 evidence: fluidr3-complete.json covers every usable note/chunk;
fluidr3-representatives.json covers real-time lifecycle/A-B metrics;
fluidr3-representative-analysis.json checks C4 harmonic evidence and levels.
fluidr3-page-regression.json records the full page regression after the discovery
race and narrow-viewport assertion fixes. The MIDI suite now has 111 tests.
`fluidr3-library-selection.json`: step 5 native Chromium 48 kHz full-page regression, selected-library GM flute output, silent Stop, refresh/replacement selection retention, cross-library override retention, and zero remaining resources (115 MIDI tests).
`fluidr3-default-library.json`: step 6 native Chromium 48 kHz full regression. Fresh pages default to FluidR3 and original MIDI assignments; verified audio, Stop, replay, Legacy selection, refresh, replacement, and zero remaining resources. Mixer gain/pan measurements use the sustained Legacy reference.
