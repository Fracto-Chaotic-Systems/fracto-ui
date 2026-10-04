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

When the main-cardioid detector reports candidate cardinality 2, the data
server automatically runs the experimental `FractoFastCalc`-cardinality →
BigComplex-Newton fallback. The page continues to render the returned
`orbital_points` and `result` fields and does not implement fallback logic
itself. The fallback is candidate refinement, not proof of a true or primitive
period: calculator cardinality is finite-precision, the solver's precision is
not preserved end-to-end, and the current acceptance check does not verify
cycle closure or stability. See the data-server orbital pipeline README for
the full flow and remaining validation work.
