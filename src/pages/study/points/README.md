# Orbital points study

This directory contains the active bailiwick list tabs and retained components
for rendering orbit samples. `../StudyPoints.jsx` renders its title and three
panes separated by two persistent splitters. The left pane has three equal
sections; its top section renders the selected object's saved display focal point
and scope through `PointsSelectedPreview.jsx`, fitting a square image within the
available width and height. Its middle section mounts `PointsMinibrotTabs.jsx` and its lower section
mounts `PointsStoredOrbitals.jsx`. The page does not mount a navigator or the
retained chart panels, or start their legacy calculations and survey polling.
Shared rendering, backend, SDK, settings, and text code remains
available to other features.

The upper-right pane mounts `PointsJuliaSet.jsx` for the selected object's core
point. It shares `SeedSurveyCanvas` with Seed Surveys' Detect tab, including
streamed survey loading, painting, progress, and stale-response cleanup. The
left-aligned canvas is fixed at 500×500, sampled on a 500×500 grid with Detect's
iteration limit, and covers scope 4.0 (`[-2, 2]` on both Julia axes). The pane
scrolls when there is insufficient room; it never scales the canvas to fit.
The Julia canvas keeps loading progress visible and hides the sample-count
completion message once rendering finishes.
Completed responses containing the full image bypass redundant row downloads,
so loading ends as soon as that image is available. Partial images continue to
drain their remaining batches before loading finishes.
`PointsStoredOrbitals` selects the first loaded orbital and publishes subsequent
row selections to the page. `PointsJuliaCanvas` overlays that orbital's stored
points using the same white dots and 6×6 black squares as Seed Surveys Detect,
through `SeedSurveyOrbitalOverlay.js`. It restores a clean Julia-image snapshot
before replacing markers and reapplies the selection after streamed paints.
Changing the middle list's selection clears the old orbital immediately.

`PointsOrbitalTraceRequest.js` prepares the selected orbital's known accesses
for future ray tracing. `PointsJuliaSet` passes the batch as `trace_request` to
`PointsJuliaCanvas`; it is not forwarded to the Julia image survey. Each batch
contains the orbital ID, period, exact focal-point strings, and one request per
stored ratio with its point index, exact landing coordinates, reduced rational
angle, and available family/validation metadata. Equivalent ratios at the same
point are deduplicated. Invalid entries are recorded in `rejected`; no ratios
means an empty request list and leaves the point-marker overlay intact. This
builder does not enumerate candidate angles or read/write a cache.

`PointsOrbitalRays` submits nonempty request batches to a selection-owned worker.
The SDK's `trace_known_dynamic_rays` groups only supplied angles by exact doubling
and reuses `trace_ray_family` for complete known families. Existing convergence,
precision, and endpoint-dynamics checks apply; each ray must also land at its
recorded coordinates and point index within the shared accuracy tolerance.
Missing partners, failed traces, and mismatched endpoints remain unresolved.
Validated families stream into the Julia overlay with Seed Surveys' ray strokes
and ratio labels, beneath the orbital squares. Path-count progress is visible
only during tracing. Selection changes/unmount terminate the worker and invalidate
late results.

`PointsOrbitalRayProgress` aligns the path-count bar and controls with the Julia
image. Cache lookup uses a short text status; the progress bar and Cancel tracing
button appear only during tracing. Completion removes the status and bar.
Cancellation retains validated paths and queued saves; canceled, partial, or
failed attempts offer Trace remaining paths, reusing the same cache-first flow.
The overlay is bound to its exact request identity, so obsolete selection
callbacks cannot restore old paths. Each paint restores the Julia image, draws
the shared Seed Surveys paths and fraction labels, then draws orbital squares
last. Streamed Julia image updates reapply that same layer order.

`OrbitalRayStorage` loads validated geometry lazily through
`GET /orbital-data/:id/ray-paths` before starting a worker. Complete compatible
caches skip tracing. Partial cached families appear immediately, and only missing
or insufficiently accurate families are sent to the worker. The worker retains
the full orbital coordinates for endpoint/dynamics validation, while its access
list and progress total contain only the remaining work. Cache eligibility keeps
whole doubling families together, so refinement never drops a required partner.
Each newly validated family queues a save through the matching PUT route.
Queued saves retain their original record identity after selection changes or
unmount. A bounded eight-entry/32-MiB memory cache speeds repeat selections.
Read failures fall back to tracing; save failures leave paths visible and show
a short notice. No failed trace is persisted as a successful path.

The shared SDK `FractoOrbitalRayCache.js` owns the solver version, exact decimal
identity, geometry checks, accuracy eligibility, and quality-preserving merges.
Migration `012_orbital-ray-paths.sql` adds the separate `orbital_ray_paths` table;
parameter-ray storage is unchanged. Server writes lock the orbital row, compare
the current focal point, period, points, and ratios, then merge and save paths
transactionally. Stale identities return 409. Geometry is excluded from list
and progression responses, and large documents reuse the existing compressed
ray-cache codec. UI layout and colors do not invalidate geometry.

## Verification and benchmark

From the Fracto root, `node scripts/benchmark_orbital_ray_paths.js --database
--runs 3` measures known-ray tracing, memory reuse, serialized cache decoding,
and MySQL reads. It writes `benchmarks/known-orbital-rays-latest.json`. Omitting
`--database` avoids database access; the database mode uses connection-local
temporary tables and never changes real orbital/cache records.

The 2026-11-08 run validated all 15 rays across fixed, period-two, period-seven,
rabbit, and basilica fixtures. Uncached trace medians were 100–894 ms; MySQL
cache read plus validation medians were 6–27 ms; in-memory validation medians
were 0.03–0.25 ms. Each uncached sample recomputes geometry, but the process/JIT
remains warm. These Node timings exclude HTTP, browser worker startup, painting,
and the production orbital-metadata join; they are not end-to-end UI timings.

Verification passed 106 regression tests covering SDK numerics, cache quality
and invalidation, concurrent/stale writes, selection races, cancel/retry,
remaining-work progress, marker/label layer order, and image-batch repainting.
The separately enabled MySQL integration test also passed using temporary tables.
Run the focused suite with `npm run test:orbital-rays`; set
`FRACTO_DB_INTEGRATION=1` to include that optional live database check.

## Files

- `PointsMinibrotTabs.jsx` owns the “free”, “inline”, and “nodal” tabs, defaulting
  to “free”. An explicit dispatcher mounts `../minibrots/MinibrotList.jsx` with
  `BAILIWICK_TYPE_FREEFORM`, `BAILIWICK_TYPE_INLINE`, or `BAILIWICK_TYPE_NODES`.
  Each list is keyed by type so switching tabs loads the correct filtered data.
  Lists use full-width selectable rows with pattern blocks and magnitudes,
  matching the lower orbital list's spacing, separators, selection color, and
  keyboard focus outline.
  It retains the shared list's existing row-selection persistence and notifies
  the page of selection. Switching tabs clears that selection and invalidates
  callbacks from earlier lists. `CoolTabs`
  fills the section height, and a ResizeObserver measures the scroll viewport
  below the tab labels for the list's `height_px` prop.
- `PointsStoredOrbitals.jsx` loads the latest v2 survey's ranked orbital headers at the selected
  core point, then loads progression details in batches of four. Coordinates
  remain decimal strings. Selection changes/unmount abort requests and polling
  and invalidate late responses. Empty storage offers a link that starts only
  that selected bailiwick's bounded discovery job. Polling ends at a terminal
  result and reloads committed data; navigating away does not cancel server work.
  Read errors offer reload rather than falsely claiming that nothing was calculated.
- `PointsStoredOrbitalsView.jsx` renders the lower section's status, calculation
  link, and selectable orbital rows. Each row shows the period pattern block
  followed by Julia landing ratios: semicolons separate points and commas
  separate ratios at one point. Ratio text truncates with an ellipsis and its
  tooltip contains the complete list. The first orbital is selected initially;
  selecting another row shows its ordered coordinates and landing ratios below.
  While calculating, a full-width native progress bar describes
  the current survey, refinement, save, or landing-ray search. Queued/preparing
  work is indeterminate; known counters show stage percentages, and ray progress
  includes completed orbitals and current angle families. Full values wrap inside
  the existing scrollable lower section.
- `PointsMainPanel.jsx` fetches the zero-seed legacy iterative series and
  Newton result, then polls the FractoCardinality seeded survey job
  over `[-1.5, 1.5]` on both axes at 0.025 intervals. It adapts the orbital point
  records and owns the three charts. The survey runs asynchronously so it
  cannot hold the legacy chart response open; polling stops when the focal
  point changes or the page unmounts. When legacy-iterative data has a positive
  cardinality, the page passes it to `/orbital_newton` with source
  `legacy_iterative`, bypassing independent detection. The supplied count is
  retained while loading and as a formatting fallback. Missing/zero legacy
  counts retain the detector-based request path. Scope-only navigator changes update the
  frame settings without refetching or restarting the charts. When the detector returns cardinality 2, the Newton endpoint
  automatically uses the FractoFastCalc cardinality as its next
  candidate. The chart displays the resulting Newton points when their count
  matches that candidate; otherwise it retains the normal detector/Newton
  points and displays fallback diagnostics. Outside the main cardioid, the
  endpoint refines a non-estimated positive calculator pattern using Newton
  and labels its source `fracto_fast_calc_outside_cardioid`; it no longer
  returns only the raw calculator shape that this chart cannot display.
- `PointsSeriesChart.jsx` draws one point series and reports its cardinality,
  timing, detector/Newton effort, and two-point fallback status when applicable.
  For legacy iterative data, its magnitude summary uses the raw offset from
  the cardioid reference point. It selects pico (`p`) or micro (`μ`) only for
  small values and otherwise displays the base value without a prefix. The
  plotted coordinates may be multiplied by `10^13` separately to make tiny
  offsets visible; that plotting scale is not the summary's unit conversion.
- `SeedSurveyChart.jsx` plots stable non-singleton periodic candidates by their
  initial seed coordinates over `[-1.5, 1.5]` on both axes at 0.025 spacing. Each point uses the SDK's
  conventional pattern hue, with HSL lightness normalized across the survey's
  observed confidence range (18–88%) when detector confidence is available.
  Calculator-derived candidates have no detector confidence and use the normal
  pattern hue. Assets surveys use the separate `FractoColors` buffer renderer. Confidence is a heuristic
  evidence score, not a probability; tooltips show its raw score to three
  decimals. Unresolved candidates retain grey
  markers and may still report their confidence in the tooltip. While its worker job runs, it shows
  sample progress and all stable and unresolved markers discovered so far; the
  chart remains fixed to the full `[-1.5, 1.5]` range on both axes. The completed
  result contains the same full point sets. `stable_points` includes both
  detector-derived and non-estimated calculator-derived non-singleton
  candidates, with a per-point `cardinality_source`; its adaptive horizon
  expansion is disabled and capped at 4,096 iterations per seed inside the
  main cardioid. Outside it, the seeded fast-calculator fallback uses level
  `0.00625`. Escapes and
  one-point results are left blank; inconclusive detector results are shown
  in grey. This is a bounded exploratory survey, not proof of
  mathematical stability. Beneath the chart, it displays the range of per-
  orbit maximum distances from the sampled orbital points to the parameter's
  cardioid reference point `Q`.
- `../StudyPoints.jsx` is the Study page shell; only the list tabs above are
  mounted, while the orbital chart panels remain disconnected.

Visible labels are registered in `../../../text/StudyText.jsx` and rendered
through `AppText` so the page remains ready for translation. The fallback
cardinality is a numerical candidate, not proof that a mathematical orbit has
been established.

For the main-cardioid interior case, the Newton chart uses the positive
legacy-iterative cardinality directly. The request explicitly supplies that
period and does not depend on a detector envelope being present. For example,
`0.2+0.3i` has legacy pattern 1 and yields one Newton-derived point (plus the
chart's closing duplicate), rather than displaying cardinality 0.

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

The orbital calculation now shares Seed Surveys' SDK scan and higher-accuracy
ray profile. Historical v1 records remain available through the data API; the
page prompts an explicit recalculation when only old discovery results exist.
It displays confirmation/discovery counts and survey, refinement and ray-family
progress. Migration 009 stores per-run evidence. No backfill runs automatically.

Interrupted, canceled, or failed checkpointed jobs expose a Resume action even
when some results already exist. The page reattaches to active work after reload;
selection alone never starts stopped work. Cancel preserves the last durable
checkpoint. Resume targets the same job UUID through a trusted-origin route.
See the data-service protocol for checkpoint units, ownership and compatibility.
