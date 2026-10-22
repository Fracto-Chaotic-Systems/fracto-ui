# Seed-survey tab components and helpers

`AssetsSurveys.jsx` in the parent folder owns navigation, tab selection, and
splitter geometry. This folder owns the render and detect tabs and their helpers:

- `SeedSurveyDetect.jsx` places equal-sized survey and orbital canvases in a
  non-wrapping flex row, up to 550×550 each. Available width determines their
  shared display size, with a 250px minimum per chart.
  It requests a 250×250 grid over half-span `1.5` with a `100K` iteration cap,
  using the caller-provided focal point: the navigator on Assets Surveys, or the
  selected minibrot core in the freeform “seeds” tab. Each column has 8px
  margins, top alignment and a fixed share of the row, with horizontal scrolling
  for a wider discoveries table. The panel scrolls when space is limited.
  Data loading, batching, and progress remain owned by `SeedSurveyCanvas`.
  Beside it, an equally sized chart reuses circuitry's `click_point_chart` markers,
  radial guides, prominent axes, and shared image frame. Mouse positions map
  continuously to seed coordinates over `[-1.5, 1.5]` with imaginary values
  increasing upward. The chart starts at `(0, 0)` and resets there when the
  focal point changes. Hover computation is client-side using
  `FractoFastCalc.calc_from_seed` with the same 100K cap to obtain cardinality.
  By default, the chart and magnitude use `newton_big_complex` points, refined with
  that cardinality, the same starting seed, 80 Newton cycles, and 64-digit
  arithmetic. Empty Newton results never fall back to calculator points. Animation-frame
  coalescing keeps only the latest pointer position. Hover does not submit
  survey jobs. Escaped or unavailable orbits show the shared no-orbital message;
  estimated calculator results remain numerical candidates, not period proofs.
- `SeedSurveyRender.jsx` owns preview/render mode and persisted half-span and
  iteration-limit controls. It passes the focal point, numeric source/display
  sizes, half-span, iteration limit, and translated accessibility label to the
  canvas. It does not submit jobs or hold survey results. The header does not
  shrink; the remaining area scrolls in render mode and includes both the full
  image and its sample-count message. The page bounds the panel by the viewport
  space below its title, and tabs fill that space without estimated tab heights.
- `SeedSurveyCanvas.jsx` owns DataBackend submission and polling, survey and
  batch-cursor state, progress/error presentation, stale-response guards, and
  polling cleanup. It accumulates decoded or packed batches in its canvas cache
  and drains unread rows even after the server job completes. New focal-point
  coordinates, source size, half-span, iteration limit, sampling, or encoding
  restart the job and
  clear old data; display-only resizing preserves the job and source cache.
  Invalid focal points invalidate pending responses and leave an idle canvas.
  It has no preview/render mode or hardcoded size choices. Unmounting stops
  client polling and ignores late callbacks; it does not cancel the server job.
- `SeedSurveyCanvasBuffer.js` owns row accumulation, packed row decoding, the
  offscreen canvas cache, and SDK painting through `FractoCanvasBuffer` and
  `FractoColors`. Packed rows use absolute offsets; buffers are column-major.

`SeedSurveyRender.jsx` selects the source/display sizes (121/255 for preview,
1024/1024 for render) and obtains
mode-specific accessibility labels through `AppText`. It explicitly selects
`bounds`/`rows` for preview and `centers`/`packed` for render. The detect canvas
uses the general defaults of `bounds`/`rows`. `source_size_px` is sent as
`grid_size`, and `size_px` is sent as `canvas_size`; any independent integer
pair within data-service capacity is supported. Display-only resizing remains
local and does not restart the numerical job.

Legacy point-array responses and confidence/iteration histogram shading are no
longer supported. Preview requires `canvas_buffer` or `canvas_buffer_batch`;
high-resolution rendering uses packed `render_batch` rows. Missing data leaves
the canvas background or previously accumulated samples in place.

Run regressions from the UI repository with:

```powershell
node --test test/seed_survey_canvas.test.js test/seed_survey_render.test.js
```

While a job is queued, running, or still draining completed row batches, the
canvas footer shows a native progress bar aligned to the image's left edge and
width. After all available rows are received, it replaces the bar with
`${total_samples} samples complete`. Footer text and the progress label are
registered in `AssetsText.jsx`; failed jobs retain their error message.

The detect chart lists the seed, calculator `pattern` (candidate cardinality),
and magnitude below the plot. Magnitude is the maximum Euclidean distance of
the displayed orbital points from `calculate_cardioid_Q(c.x, c.y, -1)`, the same
Q used by its radial guides. Single-point orbits also use that Q. With no orbit,
magnitude is unavailable (`—`); escaped seeds retain pattern `0`. Magnitude is
computed at full numeric precision and displayed to ten significant digits.

`SeedSurveyCanvas.on_canvas_rendered(canvas)` runs synchronously after each
canvas paint, including streamed batches and display resizing. Callers can draw
overlays without changing the cached survey image. Detect uses this callback to
paint a white, four-pixel-radius dot with a one-pixel black outline at Q, using the same Q branch as its orbital
chart and mapping the survey's seed bounds with imaginary values increasing
upward. Repainting the overlay after each batch keeps it visible throughout loading.

While hovering, detect also paints white orbital dots of radius 1.5 pixels with one-pixel black square outlines
(6×6 pixels), from
exactly the selected point set displayed by the chart. It restores a snapshot of
the latest survey paint before updating overlays, so previous dots disappear
without new survey jobs. `on_seed_leave` clears hover overlays and pending pointer
updates while retaining Q and the last orbital chart. Streamed paints refresh the
snapshot and redraw current overlays. Q is drawn last, above all smaller orbital dots.

The radio buttons below the orbital chart select `newton` (default) or `legacy`.
Legacy displays `calc_from_seed()` orbital points; Newton displays its refined
points. Both use the same seed and calculator cardinality. Switching reuses the
computed data and updates the chart, magnitude, and hover dots together, without
submitting a survey job or falling back between methods when points are absent.

`SeedSurveyOrbitConfirmation.js` computes the cyclic complex product
`P = (A+B)(B+C)…(last+first)` from the selected chart points when magnitude is
strictly greater than 0.25. Confidence is `max(0, 1 - abs(abs(P) - 1))`, shown
as a percentage directly beneath the orbital chart, above seed, pattern, and magnitude. This compares product length, not angle:
any unit-length product scores 100%. Missing points, nonfinite products, and
magnitudes at or below the threshold show `—`. The score is a numerical
confirmation measure rather than a probability or proof of primitive period.

The line immediately below confidence shows `newton cycles` from the current
Newton solver result, or `—` when no Newton result exists. It remains explicitly
labeled as Newton metadata when viewing legacy points. The count is the reported
iterations performed, including runs that reached the iteration limit; it does
not by itself certify convergence.

`on_survey_update` supplies the current accumulated buffer after each paint,
including partial batches, request ID, status, completion flag, focal point,
half-span, sampling, and iteration cap. `SeedSurveyOrbitals.jsx` owns a
cancellable incremental scan and fills the table while data loads. Every positive-pattern cell in the
available buffer supplies a seed for refinement, including interior and edge
samples, using exact bounds/centers grid coordinates. Pattern-zero cells are
skipped; raw data does not separately encode unresolved nonescaping samples.

`SeedSurveyScan.js` reruns `calc_from_seed` for cardinality, then Newton at that
same seed (80 cycles, 64 digits). It requires magnitude > 0.25, a finite product-length confidence score, and
a cycle-closure error <= 1e-7,
using the same calculator cardinality and Newton points as hover. It does not
apply an attracting-cycle filter. Product-length confidence
does not establish closure or stability, so the list is labeled orbital
configurations rather than stable orbitals. Candidates are deduplicated by comparing their first point with every point
in each known configuration. A Euclidean distance <= 0.01 identifies a
match regardless of cardinality, ordering, or the remaining points; that
configuration's discovery count is incremented, retaining its highest-confidence result. The scan
yields between samples, cancels on focal changes/unmount, and is independent of
hover and the chart's Newton/legacy selection. The README's old 10-cycle setting
was stale; the current Newton budget is 80.

The scan keeps the 10 unique configurations with the highest discovery counts
and displays each actual confidence percentage. There is no
100% confidence cutoff. All nonescaping samples are examined, even after ten results
are found; a higher-confidence rediscovery replaces the retained version of the
same cycle. The list updates as better candidates arrive.

Each result includes `discoveries`, the number of matching distinct nonescaping pixels
encountered during this survey (including the first). Lower-confidence matches
increment the count while preserving the best result. The scan retains records
for all unique configurations so counts remain accurate even if a configuration
leaves and later reenters the displayed top ten. Counts reset with each survey.

The scan processes each available nonescaping grid location exactly once across all batches.
There are no separate horizontal/vertical boundary passes or repeated pixel
checks. Discovery counts and the top-ten ranking include all qualifying sampled
locations, not just boundaries.

Scan results use the shared selectable `CoolTable` with columns pattern,
confidence, discoveries, and seed point. Pattern cells use StudyUtils' `render_pattern_block`;
discovery counts appear in their own column immediately after confidence. Selecting a row
sets the chart to Newton at that row's seed and keeps its orbital dots visible
on the canvas outside hover. Hover temporarily explores other seeds; leaving
restores the selected seed. Selection highlighting follows the same orbital if
ranking changes and clears when the focal point changes.

Each request has one persistent scan session retaining all configurations and
tested grid locations. New buffers queue behind active refinement; queued updates
coalesce to the latest cumulative buffer. Repaints and repeated batches never
increment discovery counts twice. Changing requests cancels old work and resets
the table. The scan is complete only after the final buffer has been processed.
The optional `on_survey_complete` callback remains available for callers needing
one notification after the entire image is filled.

Both table membership and display ordering use discovery count descending,
with stable group IDs breaking ties. Confidence has no effect on either.
Row selection and highlighting use this displayed ordering as counts change.

A progress bar above the table measures completed refinements against currently
cached nonescaping seeds, with processed, total, and remaining counts. The total
can grow as new buffers arrive; rejected or unmatched refinements still count as
processed. It reaches completion after the cached work is drained, independently
of the canvas loading progress, and resets with a new request.

Selection uses stable discovery-group IDs, never a geometric first-match lookup.
When the retained best point set overlaps another group, matching is checked in
both directions and groups are combined independently of confidence. Their
counts are summed, the highest-confidence seed/result is kept, and absorbed IDs
remain aliases so selection follows a merge. Different confidence values never
create separate rows for matching orbitals.

Closure error is separate from product confidence: it is the maximum Euclidean
error `|z[i]^2 + c - z[i+1]|`, including the last-to-first transition. The scan
rejects missing, nonfinite, or above-1e-7 closure errors before counting a discovery,
and checks again after reducing repeated traversals. Hover displays only accepted Newton points; rejected candidates leave the
Newton chart empty. Closure diagnostics remain visible below Newton cycles. Passing is numerical closure evidence, not proof of
stability or primitive period. A high confidence score cannot override closure
failure.

Newton results now explicitly report `closure_reached`, `closure_error`, and
`closure_tolerance` (1e-7). Closure checks every transition, including wraparound;
BigComplex checks use its decimal precision. Failure has status
`closure_not_reached`, an empty `point_list`, and accepted `cardinality: 0`.
The supplied estimate remains `candidate_cardinality` for diagnostics only.
Callers must require `closure_reached === true`; an iteration-limit approximation
must never be rendered or counted as an orbital. Closure does not prove the
supplied primitive period or dynamical stability.

Best-iterate selection in BigComplex uses Decimal comparisons, not JavaScript
object comparisons, and saves the updated root estimate. This corrects stale
approximations caused by exponent-form comparisons and avoids constructing the
saved cycle from the pre-update iterated point. The formerly reported six-point
99.74% example now closes within tolerance after this correction; an insufficient
iteration budget remains explicitly rejected.

## Selected-orbital dynamic rays

`SeedSurveyRays.jsx` automatically traces a selected table entry (or restores
its cached rays), with trace/cancel/visibility controls below the table.
A dedicated worker searches for and validates external-ray approximations for
the selected closed, repelling orbital. Rays appear between the survey image
and orbital markers, with Q drawn last. Rays are hidden during hover and restored
on mouse leave; tracing always uses the selected table entry. Attracting/neutral cycles, unresolved
connectedness, disconnected sets, and numerical/search limits receive specific
messages. See [RAYS.md](RAYS.md) for ownership, behavior, and limits.

The published basis is [Milnor, Astérisque 261 (2000), §2/Appendix A](https://numdam.org/item/AST_2000__261__277_0/)
and [Benini–Lyubich, AIF 64 (2014), §2](https://doi.org/10.5802/aif.2888).
These are dynamic-plane rays, not parameter-plane wakes; a confidence score or
large discovery count alone does not establish eligibility or completeness.

All supported orbital periods use general nonduplicate angle-cycle enumeration
modulo `2^n-1`, followed by numerical landing validation. The former seven-point
special case and broad angular-discovery fallback have been removed. Family
and angle-period limits are reported explicitly. See [RAYS.md](RAYS.md), with
the published basis in [Milnor (2000)](https://numdam.org/item/AST_2000__261__277_0/).

The [ray documentation](RAYS.md#code-flowcharts-and-current-capability-boundary)
links detailed flowcharts and explains the current capability boundary:
table selection validates rays for an existing orbital; finding a new orbital
from only `c,n` remains a documented design. Published theoretical references
are included in those guides.

The freeform minibrot study also embeds `SeedSurveyDetect` directly in its third
“seeds” tab. The host supplies a finite core point, available width and 600px
height; Detect’s existing scrolling and cleanup behavior applies unchanged.

Detect column sizing reserves 32px for margins and 16px for a vertical scrollbar;
both displayed images shrink together to fit narrower hosts without wrapping.
The 250×250 data grid is independent of display size. Below the combined minimum
width the existing container scrolls horizontally, keeping both columns on one
row; vertical scrolling remains available for the table and metadata.
