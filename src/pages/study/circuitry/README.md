# Circuitry study page

This folder contains the study UI for inspecting detected orbital paths and
their interpolated circuitry curves.

- `CircuitryChart.jsx` requests and renders circuitry data, aligns its orbital
  points and curve samples, and owns the page-level chart interactions.
  Overlapping data requests are generation guarded so that a late response
  for an older focal point cannot replace the current chart.
- `CircuitryAudioController.js` manages browser Web Audio playback lifecycle
  and transitions.
- `CircuitryAudioUtils.js` builds and validates waveform profiles from the
  interpolated curve data.

The orbital-2 Newton investigation is experimental and is not invoked by normal
circuitry requests. The UI renders the established `orbital_points` and
`result` response fields.
