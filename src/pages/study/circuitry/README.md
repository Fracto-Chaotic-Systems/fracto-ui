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
period: calculator cardinality is finite-precision and the solver's precision
is not preserved end-to-end. The current pipeline and two-point fallback require
`closure_reached === true` before accepting Newton points; this numerical
closure check does not establish stability or a primitive period. See the data-server orbital pipeline README for
the full flow and remaining validation work.

`CircuitryChart.jsx` is also embedded directly by the freeform minibrot
“orbital” tab, using the selected record’s core point and the same backend
request, rendering, point selection, animation and audio lifecycle. The host
owns dimensions and tab state; the chart remains independent of tab layout.

`CircuitryLayout.js` sizes the main square and controls column from the caller’s
width budget, reserving 32px for margins and at least 260px for controls. The
main square shrinks when necessary. The controls column uses the remaining
space but is capped at the main square’s width (with a 260px controls minimum);
the distance chart fills that column and is half the main square’s height. Column height follows its
content, so the point table contributes naturally to scrolling. Extremely
narrow hosts calculate a 500px minimum combined width, but clip horizontal
excess rather than wrapping the controls underneath the main chart.

The initial 85%-height square is a baseline for constrained panes, not a hard
maximum. If both columns would otherwise leave unused width, the main square
and controls column grow together until they fill the available width or the
main square reaches the full height budget. At 600px height, this avoids the
former fixed 1,052px row cap: a 1,132px budget now renders 550px columns with
32px margins, instead of leaving 80px empty. The distance plot remains half
the current main square’s height.

The two columns render in a non-wrapping flex row. The main square keeps its
size; the controls column can shrink with `min-width: 0` and clips horizontal
overflow. The row also hides horizontal overflow, so small differences caused
by scrollbars or dynamic sizing cannot push the controls below the main chart.

Animation playback uses a constant 100 steps per second (10ms timer interval),
equivalent to the former 20 FPS base at the speed slider’s maximum 5× setting.
The slider, mutable speed state, change handler and persisted speed setting
have been removed. Existing stored speed values are ignored. Forward/reverse
transport and audio behavior otherwise use the same shared component.
