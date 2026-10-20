# Selected-orbital ray tracing

## Published basis

The model is quadratic dynamic rays and angle doubling, as developed in
[Milnor, _Astérisque_ 261 (2000), §2 and Appendix A](https://numdam.org/item/AST_2000__261__277_0/),
and inverse-branch landing for connected polynomial Julia sets in
[Benini–Lyubich, _Annales de l’Institut Fourier_ 64 (2014), §2](https://doi.org/10.5802/aif.2888).
The implementation's search bounds and tolerances are numerical engineering
choices. See the [SDK ray guide](../../../../../../sdk/orbitals/RAYS.md) for the full algorithm and limits.

## Interaction and responsibilities

Selecting an orbital configuration in the table automatically starts ray tracing
or restores its cached result. The **trace rays** button remains available to
restart a cancelled job. A preselected orbital also traces when mounted.
`SeedSurveyRays.jsx` owns one worker, progress, cancellation, visibility, and an
eight-selection in-memory result cache. Selection/focal-point changes terminate
old work, discard its overlay, and invalidate late messages with a generation ID.
Unmount and cancel also terminate the worker. The cache key retains the complete
focal point and selected point set. Hover calculations do not start or cancel
ray jobs; the rays continue to refer to the selected table row. The overlay is
hidden during hover, including when worker results arrive, and is restored on
mouse leave. Hovered seeds never become ray-tracing inputs.

`SeedSurveyRays.worker.js` delegates to the SDK and sends progress/results only.
Calculation exceptions become a user-facing failure; browsers unable to start
workers receive a separate message. The catalog in `AssetsText.jsx` owns every
label and condition message, including attracting, neutral, failed refinement,
changed branch, disconnected/unresolved Julia sets, and search-period limits.
A no-result message explicitly distinguishes a failed numerical search from
mathematical nonexistence. Success also warns that additional accesses may exist.

`SeedSurveyRayOverlay.js` supplies orbital colors to the shared
`utils/render/FractoRayOverlay.js` painter, which clips the accepted polylines to the seed canvas and
maps complex coordinates using the existing half-span. The parent restores the
buffer image, paints rays using the selected orbital cardinality and the same
`FractoUtil.fracto_pattern_color()` palette as the orbital chart, retaining a
thin dark outline (2px outer stroke over a 1.25px colored stroke), paints orbital markers, then paints
Q last. Geometry remains in complex coordinates so repaint/resizing uses the
canvas's current dimensions. The generic canvas and data service do not know
about rays. Each ray's exact external-angle fraction is painted near its first
entry from the exterior, inset just enough to keep the full label within the
canvas. Labels use black text inside padded white boxes with a 1px dark border and
are painted after all ray strokes. Box padding is included in the edge inset
to prevent clipping. Off-canvas rays receive no label; no curve is extended to reach
a label position. External angles follow Milnor's published framework cited above.
No fabricated segment joins an incomplete ray to its target.

These are **dynamic-plane** rays at the selected focal parameter. They do not
show Mandelbrot parameter rays, parameter wakes, or boundaries inferred solely
from product confidence/discovery counts. The published references above
explain this distinction and the orbit-portrait setting.

## Checks

`node --test test/seed_survey_rays.test.js test/seed_survey_detect.test.js`
covers worker lifecycle, stale responses, cache reuse, visibility, clipping,
coordinate scaling, and existing selection/hover rendering. SDK ray tests cover
analytic and orbit-portrait examples from the published theory.

## General doubling-family enumeration

Every supported period uses the same arithmetic construction: for angle period
`n`, enumerate multiplication-by-two cycles modulo `2^n-1`. All members of each
cycle are marked visited, eliminating duplicate rotations; shorter divisor
cycles are excluded. Period five yields six distinct families, including
`1,2,4,8,16` and `3,6,12,24,17` modulo 31. There is no seven-point special case.
The published basis is [Milnor (2000), §2](https://numdam.org/item/AST_2000__261__277_0/).

For selected orbital period `p`, the worker first tests angle period `p`, then
multiples of `p` if none match, to allow multiple rays at one orbital point.
It completes the first matching angle period, up to a default budget of 256
families and maximum angle period 24. Fractions alone describe distinct angle
cycles, not necessarily distinct spatial orbitals or attracting cycles. Each
family must pass the same closure, landing, precision, and dynamics validation.

The first ray is matched to any selected point, allowing cyclic shifts of
stored point order. No dyadic sampling, angular subdivision, or broad fallback
runs. A specific message identifies the family-budget limit; an unsuccessful
numerical run never claims that no rays exist. Hover remains independent, and
automatic table-selection tracing/cancellation/caching are unchanged.

## Code flowcharts and current capability boundary

The SDK guide now contains both detailed code-oriented flowcharts:

- [Proposed discovery from only c and n](../../../../../../sdk/orbitals/RAYS.md#flowchart-1-proposed-discovery-from-c-and-n).
- [Implemented single-ray tracing](../../../../../../sdk/orbitals/RAYS.md#flowchart-2-implemented-single-ray-tracer).

The first is a design for using a traced endpoint as a Newton seed; it is not
currently exposed by this tab or by `find_dynamic_rays()`. Today's worker
receives the selected table entry's existing point list, refines/classifies
that cycle, enumerates angle families, and checks each family against those
selected points. Passing only a focal point and cardinality does not currently
start standalone orbital discovery. The low-level tracer can trace a specified
angle without an orbital, but its endpoint still needs independent validation.

The second chart documents the implemented inverse-Böttcher chain, adaptive
full-step/two-half-step comparison, terminal precision check, and termination
reasons. The guide also details all result statuses, exact numerical thresholds,
progress counters, and the distinction between reaching a finite potential and
establishing a landing point. Its theoretical basis is the published works
cited above; finite numerical checks are not rigorous landing certificates.
