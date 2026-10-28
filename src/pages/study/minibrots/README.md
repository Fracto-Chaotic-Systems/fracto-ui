# Minibrot study panels

The freeform right panel includes a **test terrain mesh cache** button directly
under **send to**. `MinibrotTerrainCache.jsx` starts a tile-service job for the
selected record's saved display region and polls its progress. The server loads
the record from `free_bailiwicks` and chooses native tile spacing meeting at
least 1000 samples along both region axes. Results report created/reused meshes,
coverage gaps, stored bytes and a relative assembly manifest. Changing selection
unmounts the poller and prevents stale UI updates; background cache jobs continue.
The button is not mounted for inline/nodal lists. Cached files are built for
future simulator assembly; this test does not replace the current preview.

These components display the freeform, inline, and nodal bailiwick lists and
selected-record details. `StudyMinibrots.jsx` selects the freeform mode;
`StudyInline.jsx` and `StudyNodes.jsx` reuse the same panel composition.

- `MinibrotPanel.jsx` owns the selected record, shared render readiness, and
  internal splitter placement. It enables the context canvas only in freeform
  mode, so the shared inline/nodal detail panels do not acquire this view.
- `MinibrotList.jsx` loads the requested bailiwick type and persists row selection.
- `MinibrotLeftPanel.jsx` renders the existing image at the record's saved
  display scope, plus orbital/pattern tabs.
- `MinibrotRightPanel.jsx` displays the title, legend, magnitude, core point,
  coverage, and send-to controls. The small locator canvas and property table
  share a normal-flow flex row, with the locator on the left and the table on
  the right. Both retain their width; neither is positioned over other content.
  For freeform records, the shared `CoolTabs` interface appears below those
  details with “orbital” first (selected initially), followed by “ray paths”
  and “seeds”.
  The ray-paths tab contains the 500×500 context canvas, wake table and
  calculation/cache messages. The canvas initially uses the
  saved display focal point and
  `3 * Number(display_settings.scope)`. It does not recenter on `core_point`
  or modify the saved settings. Its container scrolls when the available height
  is insufficient; the canvas retains its fixed dimensions. The outer panel
  constrains the freeform content to the remaining viewport width so narrow
  areas can scroll horizontally as well.

The context canvas uses the existing `FractoRasterImage` / `FractoCanvasClient`
canvas-buffer path and normal renderer defaults (including square aspect ratio
and the current tile strategy). It has its own renderer lifecycle and does not
change the left panel's readiness or pattern buffer. A key including record ID,
display focal point, and expanded scope remounts the raster on selection or
saved-view changes, keeping old asynchronous paints on the detached old canvas.
Wheel up zooms in and wheel down zooms out around the current center, using
Navigator's factors: 1.5 normally, 1.618² with Shift, and 1.618 with Alt
(Alt takes precedence). Clicking recenters on that parameter coordinate.
A non-passive wheel listener prevents page scrolling over the image. This local
viewport does not change the selected record, saved display settings, or ray
selection. Each view remounts only a hidden raster; a persistent visible canvas retains
the last complete image and ray overlays until the latest raster is ready.
The completed raster is copied and its rays painted in the same callback, so
zoom and focal-point changes do not flash a blank image. Obsolete completion callbacks
cannot overwrite its base image. Existing world-coordinate ray paths are
reprojected and clipped to the new view, without rerunning or saving traces.
Zooming does not refine the original path sampling or landing tolerance.
Selecting a different record or changing its saved view resets this local view.

No extra canvas is mounted for missing patterns or invalid display coordinates
or nonpositive/nonfinite scopes. Visible accessibility text lives in StudyText.

## Generated paths and theoretical basis

The context canvas depicts the parameter plane of `f_c(z)=z²+c`. It generates
five groups automatically, displayed in this table order:

| Row                                         | Target                                           | Pattern block / selected hue           |
| ------------------------------------------- | ------------------------------------------------ | -------------------------------------- |
| Principal antenna tip (selected by default) | Tuned analogue of c=-2, a preperiodic parameter  | No stable pattern (dash); parent P hue |
| 1/2                                         | Period-doubling attachment                       | 2P                                     |
| 1/3                                         | Threefold attachment at multiplier exp(2*pi*i/3) | 3P                                     |
| 2/3                                         | Threefold attachment at multiplier exp(4*pi*i/3) | 3P                                     |
| 0/1                                         | Root access of the selected component            | P                                      |

P is the selected record's parent pattern. These local rotation/access labels
are not the fractions written on the rays: those are global external angles.
The tip uses local **external** angle 1/2 under tuning; it is distinct from the
**internal** 1/2 doubling wake. Bulb rays bound wakes rather than outlining
bulbs, and none of these paths is continued through the set's interior.
The tip is not a parabolic bulb attachment or a stable child component.

The theoretical basis is John Milnor, _Periodic Orbits, External Rays and the
Mandelbrot Set: An Expository Account_, Astérisque 261 (2000), 277–333,
[sections 1, 3, 6 and 8](https://numdam.org/item/AST_2000__261__277_0/),
and Dierk Schleicher, _Rational parameter rays of the Mandelbrot set_,
Astérisque 261 (2000), 405–443,
[published article](https://numdam.org/item/AST_2000__261__405_0/).
These works explain parameter/dynamic planes, wake boundaries, multiplier
coordinates, tuning and rational-ray landing. The numerical implementation
and half-pixel acceptance are visual approximations, not proofs of landing.
The 500px canvas and factor-three display scope are product requirements.

Five complete groups ordinarily return ten rays. The main cardioid returns
eight because its root access and principal tip each have a single ray.
Root/satellite-only SDK tests count eight rays for ordinary components and
seven for the main cardioid; those counts exclude the tip. The visible count
may be smaller because paths can lie outside the view or fail numerically.

## Components and data flow

- `MinibrotContextCanvas.jsx` owns the raster snapshot, worker lifecycle,
  group statuses, selected row and overlay painting.
- `MinibrotRays.worker.js` calls `find_minibrot_rays` with `core_point`, the
  parent period and tolerance `scope/1000` (half a 500px pixel). It enables
  both `include_thirds` and `include_tip`; the SDK default stays root/doubling.
  Progress messages and per-group completion messages arrive during calculation;
  each calculated group is saved immediately, followed by a final assembled result.
- `MinibrotRayTable.jsx` displays relative angle, pattern and absolute external
  fractions. It receives group data, parent period, selection and callback;
  it does not derive angles or own selection state.
- `utils/render/FractoRayOverlay.js` projects and clips centered ray geometry,
  paints outlined strokes and optionally adds edge fraction boxes.

The SDK verifies root access first and uses its completed characteristic pair
to normalize length-P binary blocks A and B. The main cardioid uses A=0,B=1.
Exact BigInt substitution generates AB/BA for doubling, AAB/ABA for 1/3 and
BAB/BBA for 2/3. Tip fractions use 0.BAAA… and 0.ABBB…, the two tuned binary
expansions of external angle 1/2, with duplicate fractions removed.

Each satellite pair traces toward an independently computed multiplier
attachment. Root +1 continuation stops just short of the singular equations;
primitive cusps and satellite roots use different exterior probe geometry.
The tip first follows a tuned ray to seed Newton refinement of
`f_c^(3P)(0)=f_c^(2P)(0)`. It checks the residual, repelling return and movement
from the ray-derived estimate before final tracing. The eventual repelling
period can divide P; it need not equal the parent pattern.

See the SDK guides for equations, invariants and implementation limits:

- [Parameter-ray overview and full flowchart](../../../../../../sdk/orbitals/PARAMETER_RAYS.md)
- [Threefold wakes and exact substitution](../../../../../../sdk/orbitals/SATELLITE_RAYS.md)
- [Principal tip discovery and endpoint validation](../../../../../../sdk/orbitals/ANTENNA_RAYS.md)

## Table selection and canvas rendering

The principal tip is selected initially. Rows can be selected by clicking or
by focusing them and pressing Enter/Space. The table's pattern cells reuse
`StudyUtils.render_pattern_block` at P,2P,3P,3P for the root and satellite rows.
Blocks do not depend on ray completion. The tip cell is a dash because its
endpoint is preperiodic. The tip label can wrap after "Principal", keeping
"antenna tip" together.

Every repaint restores pristine raster pixels, translates parameter coordinates
by the saved display focal point, and draws all returned paths in white without
labels. Selected paths are painted last with
`FractoUtil.fracto_pattern_color(pattern,10000)`: roughly 65% lightness instead
of the default iteration 255's 45%. The tip uses parent P as a visual hue
convention, not a claim about a stable orbital. Dark outlines remain thin.
Only selected paths receive black global-fraction text in bordered white boxes
near the canvas edge. All returned fractions remain listed in the table,
including incomplete paths; missing paths show a placeholder.

Raster and ray calculations run independently. Worker results update state
before painting via the `setState` completion callback; raster completion also
repaints. This prevents a selected table row from appearing without its color
when the worker finishes after the raster. Table selection changes only repaint the
current result and do not recompute rays. Record/view changes remount the keyed
component, terminate old work and suppress stale worker/raster callbacks.

## Completion, failures and numerical limits

Each group retains its own result (`root_access`, `doubling`,
`thirds["1/3"]`, `thirds["2/3"]`, `antenna_tip`). Aggregate success requires
all requested groups to complete. Any available paths with an unresolved group
produce a partial result; failed groups are named below the canvas with their
registered AppText reason. Complete groups remain visible.

A trace that stops early retains every accepted segment, even far from its
expected connection. The failed sample is excluded, landing remains unconfirmed
and no artificial final connector is drawn. Only completed root access can
supply tuning angles. Without it, doubling retains an independent exterior
probe fallback; thirds and tip report that verified root angles are required.
Tip endpoint-refinement failure retains available unconfirmed prefixes.

The attempted parent-period range is 1–32. Root, doubling and final tip tracing receive
`max(4096,512*P)` depth; thirds receive `max(4096,768*P)`; preliminary tip
discovery uses `max(256,64*P)`. The tracer uses a 64-digit native-path or 80-digit precise reference
with native perturbations and Decimal sample retries so tiny parameter corrections are not repeatedly
rounded into the full parameter. Higher-period endpoints use Decimal refinement; angle probes can use Decimal
integration and reconstruction. Narrow wakes and inaccurate cores can still fail.
The former "at this zoom" error was misleading: failures now identify the
numerical check or budget, not an inferred zoom prohibition.

Published context for finite-arithmetic tracing limitations is
[Romera et al. (2013), Mathematical Problems in Engineering, article 105283](https://doi.org/10.1155/2013/105283).
The implementation uses its own perturbation recurrence rather than that
paper's Bezier fallback. Published landing theory does not certify these
engineering tolerances, probe ratios or budgets.

## Verification

`test/minibrot_context_canvas.test.js` covers worker inputs and flags,
cancellation, group failures, row selection, pattern colors, selected-only labels
and deferred state updates in both worker/raster arrival orders. The shared
seed-survey overlay tests protect the painter's default label behavior.
SDK parameter, satellite and antenna tests cover exact fractions, endpoint
checks, unsupported inputs, independent prefixes and facade compatibility.

Numerical regressions include the reported period-five/eight components,
period-twelve slow parabolic approach and period-sixteen root/satellite rays.
The antenna suite checks -2, the period-two tip and the rabbit tip. The reported
period-sixteen core 0.273428557437+0.595445688613i was also checked with both
tip rays landing within tolerance 0.000005015. See the SDK guides for exact
example fractions and the distinction between tests and numerical observations.

## Exponential fraction display

`MinibrotRayLabels.js` formats the same exact angle for table cells and selected
canvas labels. Natural denominators are 2^P-1 for root access, 2^(2P)-1 for
doubling, 2^(3P)-1 for thirds, and 2^P(2^P-1) for the principal tip, displayed
with superscript exponents. Numerators are expanded with BigInt to match these
unreduced denominators; e.g. period-two root 1/3 becomes 1/(2²−1), while its
doubling ray 2/5 becomes 6/(2⁴−1). Solver fractions, angle keys and selection
identity remain unchanged. The shared painter accepts `display_label` and
otherwise keeps its usual angle-key labels, preserving seed-survey behavior.
This supersedes descriptions of reduced numeric denominators in these labels.
The binary tuning basis remains the published Milnor reference above; changing
notation changes neither the angle nor the numerical landing checks.

## Higher-period calculations and progress

Parent period 32 is the next supported ceiling to attempt. Above 20, center and
attachment continuation use isolated 80-digit Decimal arithmetic and preserve
exact coordinate strings for the reference orbit. Satellite ancestry can supply
root-angle blocks by exact mechanical-word tuning, avoiding broad fine-angle
searches and redundant ancestor ray traces. Primitive/unresolved ancestry uses
exterior probes with a high-precision integration fallback. The principal tip
uses Decimal preperiodic endpoint refinement. Native sample solves can retry
in Decimal; endpoint distance is checked before projecting to Number.

`MinibrotContextCanvas` displays the current worker stage and an elapsed-seconds
message updated on the main thread once per second. It remains responsive
while the worker performs a synchronous expensive phase. Result/error/unmount
clear the timer, and record changes terminate the old worker. Individual
precise ray traces and Decimal angle discovery have 120-second limits;
these are operation limits, not a whole-request deadline. Existing depth caps
also scale with the parent period. Partial paths and named failure messages
remain available. Higher periods may take minutes; elapsed time is not a
percentage or an estimated completion time.

End-to-end SDK regressions require all ten rays at parent periods 21 and 32.
Observed isolated runs took about 11 and 45 seconds respectively at tolerance
1e-5; these times depend on the component, tolerance and machine load. UI tests
check initial precision messaging and timer progress/cleanup. The
[precision guide](../../../../../../sdk/orbitals/PARAMETER_PRECISION.md) records
inputs, precision ownership, budgets and limitations, with published
[Milnor (2000)](https://numdam.org/item/AST_2000__261__277_0/),
[Schleicher (2000)](https://numdam.org/item/AST_2000__261__405_0/) and
[Bulirsch–Stoer (1966)](https://doi.org/10.1007/BF02165234) references.
The existing raster precision and minimum ray tolerance are unchanged; the
higher period ceiling does not promise arbitrary zoom or universal convergence.

## Shared persistent ray cache

The selected record ID is passed to `MinibrotContextCanvas`. It lazily retrieves
`GET /minibrot/:id/ray-paths` before starting a worker. A compatible cache that
satisfies the current tolerance paints without starting any calculation. Partial
or coarser saved paths remain visible while missing/inadequate groups calculate.
Geometry is excluded from both ordinary minibrot lists and generic record lists.

`MinibrotRayStorage.js` owns the backend adapter, immutable record identity and
serialized save queue. The worker's `on_group` messages save each newly computed
group through `PUT /minibrot/:id/ray-paths`, before the remaining groups finish.
Queued saves continue after leaving the record; late reads/messages cannot
paint another record's canvas. Failed storage does not suppress calculation or
hide the current paths. Registered messages distinguish loading, saved results,
saving and persistence failures. A lookup times out after five seconds.

The server performs a transactional quality merge: successful groups survive
failed/partial results, tighter completed requests supersede coarser ones, and
other clients' groups are retained. Reuse requires matching algorithm version,
exact core and period plus adequate requested/achieved tolerance. Core edits
invalidate a saved cache and a late write against a changed record is rejected.
The existing tip-first selection, colored highlights and exponential denominator
labels are recreated from stored geometry and are not stored as canvas pixels.

Root migration 003 adds nullable JSON `free_bailiwicks.ray_paths`. It preserves
existing record data and can safely be resumed; deployments sharing a database
serialize migrations. Larger documents compress transparently in the database.
See [the cache guide](../../../../../../sdk/orbitals/RAY_CACHE.md) for payloads,
size bounds, rollout, diagnostics and the retained published
[Milnor (2000)](https://numdam.org/item/AST_2000__261__277_0/) and
[Schleicher (2000)](https://numdam.org/item/AST_2000__261__405_0/) numerical basis.
Caches are shared across browsers/machines using the same database; separate
server databases keep separate cache contents. Tests cover cache-only display,
partial reuse, incremental saves, offline behavior and stale record callbacks.

Cached paths remain visible while missing or finer groups are calculated. Each
worker group is merged by cache quality and painted immediately, including the
selected row highlight; persistence is independent of display. A failed final
calculation retains available paths and reports a partial result. Raster-first
and cache-first completion both repaint the available geometry once ready.

On initial mount the visible canvas is ready for cached ray painting before the
background raster completes. Previously calculated groups therefore appear as
soon as storage returns, while missing groups continue calculating. Background
completion replaces the initial base and repaints the same available rays.

Persistence also records unsuccessful attempts with empty ray arrays. A successful
save alone does not establish that any drawable geometry exists: the UI reports
that calculation results were saved with no paths when the available geometry
is empty, and lists per-group failures after an empty final result. The older
“Calculated ray paths saved” message incorrectly covered empty attempts too.

An empty group save during ongoing discovery reports saved calculation progress,
not a final no-paths outcome. The no-paths persistence message appears only once
calculation finishes (or fails) and the elapsed progress timer has stopped.

## Orbital tab

`MinibrotStudyTabs.jsx` owns tab selection and mounts only the active analysis
view. The first/default “orbital” tab reuses `CircuitryChart.jsx` directly, with
the selected record's core point as its focal point, and saved display scope.
It includes the same interpolated orbital chart, radial/sequence mode, distance
plot, point selection, animation transport and audio controls as the
orbital circuitry page. The embedded chart uses a 600px height and the actual right-pane width, minus
24px for the tab card and padding. The outer `MinibrotPanel` supplies that width
from its bounds and splitter position, avoiding the former study-sidebar offset
that overstated available space. Narrow panels use a 500px minimum chart layout
and clip small horizontal excess in the orbital flex row instead of wrapping
its right column. The distance plot is half the main chart height.

The second “ray paths” tab retains its saved-display focal point and triple
scope. No circuitry algorithms or data requests are duplicated. Changing the
record keys a fresh chart at the new core; the shared chart's existing request
guard suppresses stale results. Switching tabs unmounts the inactive chart,
stopping its animation/audio or ray worker; cached ray groups remain persisted.
The selected tab is local state, retained across record selection within the
mounted panel. The standalone circuitry page's navigator settings are unchanged.

The shared orbital animation now runs at a fixed 100 steps per second, the
former slider maximum; neither host shows a speed slider.

## Seeds tab

The third/rightmost “seeds” tab mounts the existing `SeedSurveyDetect` at the
selected record’s core point. It receives the same content-width budget as the
orbital chart and a 600px height. Its existing `overflow: auto` container provides
vertical scrolling for survey results and controls (and horizontal scrolling
when necessary). Canvas sampling, hover orbit detection, the discoveries table,
selection overlays and dynamic-ray controls remain owned by the shared survey
components; no detector or request code is duplicated here.

The component is keyed by record ID and core point so selecting another minibrot
resets the survey. Only the active tab is mounted; leaving seeds releases its
polling/scan/ray resources using the existing lifecycle. Unmount stops client
polling, but does not cancel a survey job already running on the data server.

The shared seeds view sizes both images equally from the tab width (250–550px),
keeps its columns in a non-wrapping flex row and preserves 250×250 sampling.
Results still scroll vertically; very narrow panels can scroll horizontally.
