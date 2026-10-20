# Minibrot study panels

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
  For freeform records, a 500×500 context canvas
  appears below those details, using the saved display focal point and
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
  Progress messages are sent during calculation; all groups arrive together
  in the final result, rather than streaming individual group paths.
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
when the worker finishes after the raster. Selection changes only repaint the
cached result and do not recompute rays. Record/view changes remount the keyed
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

Supported parent periods are 1–20. Root, doubling and final tip tracing receive
`max(4096,512*P)` depth; thirds receive `max(4096,768*P)`; preliminary tip
discovery uses `max(256,64*P)`. The tracer uses a 64-digit critical reference
with native perturbations so tiny parameter corrections are not repeatedly
rounded into the full parameter. Endpoint refinement and angle probes still
have finite-precision limitations; narrow wakes and inaccurate cores can fail.
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
