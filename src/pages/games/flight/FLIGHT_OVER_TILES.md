# Rendering of Tiles During Flight

This document outlines the requirements and basic operation of the tile-based flight simulator.

## Starting Point
1. A tiling interface exists that has been used to render 2D portions of the complext plane, for the purposes of studying the Mandelbrot Set.
2. The mechanisms that are in place to cache tiles for rendering should be re-used as much as possible, and enhanced if necessary for this feature.
3. On the "game play" page, a simple controller interface has been created, and linked with status indicators that signify various flight states of the craft.
4. Details about the existing infrastructure referenced in this document can be found in the documentation in the surrounding areas of code and the Fracto SDK.
5. The rendering should be on a canvas that fills the content area of the page, with z-index lower than the existing dashboard and controls.

## Requirements

1. Flight controllers on the "Game Play" page should affect the motion of a craft within the volume of space above the complex plane.
2. Accurately rendering the contents of tile data with smooth motion will require sophistocated optimization methods to maximize frame rate and support the highest standard of visual detail.
3. An algorithm must be in place to manage the relative speed of the craft as it gets closer or further away from the complex plane (explained further on).
4. There is no "terrain" to this rendering, as has been introduced elsewhere in this app. The complex plane is simply a flat surface with rendered tile data.
5. The craft can hover in mid-flight, but when in motion can only go forward. In this sense it's more like a helicopter than an airplane.

## Rendering Scheme

The overall approach involves ray tracing, which is similar to the 2D approach in a basic way.
To render a 2D image, the scope is divided by the number of pixels to determine the complex coordinates of each pixel.
In this rendering, a 3D ray should be used to intersect the complex plane, thus determining which tile and then which (i, j) data point of that tile which should be used to render the given pixel.


To minimize the number of tiles required for a given rendering, it's important not to load more tiles than is necessary for the given framing.
Level 3 tiles have the largest scope, so they can be used at points that are distant from the viewer.
Parts of the plane that are closer to the viewer will require deeper levels in order to display the true amount of detail that can be obtained.

There's a simple test to determine if the tile being used for a given pixel is not at a low enough level to correctly render details:
If the same data point index (i, j) of the same tile is used for two different ray-traced pixels, then a deeper level tile must be used instead in that area (and *only* that area, until there is evidence for the need of more detail).

Once the need for the deeper level tile has been identified, that detailed tile should be used in the "catalog" of all tiles used in the ray tracing for that frame, and accessed in future tracings instead of the coarser level (parent) tile.
Using this rule, an adaptive rendering scheme should be able to quickly find the fewest number of tiles of the correct scale to render a given point of view.

The rule for pixel uniqueness will understandably break down at maximum depth, but that should not be prevented or regarded as an error condition.

An important part of this adaptive rendering is the coloration of the "3D" canvas buffer, which contains only (pattern, iteration) pairs from the traced rays.
As with 2D rendering, the entire buffer must have the colors and shading determined only for that particular frame.
Subsequent frames might have different shading in some areas due to the overall coordination of values when choosing levels of light and dark.
So the process of 1) get the correct (pattern, iteration) for each pixel, then 2) use `FractoColors` to modulate the scheme as a whole is almost identical to the pipeline of generating a 2D image.

## Velocity Relative to Altitude

It's necessary to view the actual velocity of the craft as a function of the distance to the complex plane.
When the craft is closer to the plane, the motion of the craft must be reduced, even though the flight indicators show identical airspeed.
This is required to give the illusion of depth of the field, because as the craft descends in altitude, the meaning of the unit length of motion is redefined.

Most importantly, the craft never is allowed to intersect the surface, because the closer it gets, the slower it travels.
Eventually, at very low levels, blocky pixels will indicate that the maximum depth has been achieved, but this should not be considered a problem or even an error condition.

## Initial conditions

On page refresh, the craft should be stationary, headed north (in the positive direction of the i-axis) at a position of (-0.5, -2.0), at an altitude of 1 unit above the plane.
The right joystick should allow viewing in all directions.

## Revisions to this Specification

As requirements change, so too should this document.
For every significant change made to this spec, add a comment at the end with a date to indicate change history.

## Flight State and Dynamics Calibration

World altitude is calibrated at 2500 feet per unit. Indicated airspeed is a
nonnegative command; actual world speed is proportional to world altitude.
At altitude `h`, speed in world units/second is
`airspeed_knots * (6076.11549 / 3600) / 2500 * h`.
Pitch divides this velocity into forward horizontal travel and climb/descent.
Descent uses exponential altitude integration so the craft never reaches the
plane. Numerical altitude guards of 1e-100 and 1e100 prevent floating-point
under/overflow, well beyond the range of tile detail.

The right joystick controls a separate world camera orientation at up to 90
degrees/second. Heading wraps through 360 degrees and viewing elevation reaches
straight up/down. Releasing the stick retains the viewing direction independently
of subsequent craft turns. Initially the view is level and north-facing.

<!-- 2026-11-18: Accepted altitude calibration, altitude-scaled velocity with
exponential descent, and independent retained camera orientation; implemented
flight state and dynamics as step 1 of the flight rendering plan. -->

## Perspective Projection Contract

The pure projection stage uses pixel-center pinhole rays, square pixels, and a
configurable vertical field of view, initially 60 degrees. Camera heading and
pitch are independent of craft attitude, with no camera roll. The surface is
the infinite flat plane at altitude zero; tile coverage is resolved separately.
Rays directed away from the plane are sky. Rays with absolute unit vertical
component at most 1e-12 are classified as horizon. Remaining downward rays
produce finite complex-plane coordinates, with a separate numerical result if
coordinates or distance exceed the finite number range. Frame results use
reusable row-major numerical buffers, with no tile access or coloring in this
stage.

<!-- 2026-11-18: Implemented the pure ray-to-plane projection stage (step 2),
with configurable 60-degree vertical perspective, explicit sky/horizon results,
and reusable worker-transferable intersection buffers. -->

## Numerical Tile Transport

Flight tile access reuses the SDK server cache through `/tile`, with a separate
bounded `/tile_availability` lookup against the loaded compiled index. Availability
is checked for requested canonical codes rather than transferring the full index
to the browser. Southern points reuse northern tiles by conjugate symmetry.
The browser keeps a bounded LRU cache of numerical samples, deduplicates requests,
limits concurrent loading, and cancels work obsolete for the current view.
Source identities prevent mixing releases. Missing index entries and temporary
source failures remain distinguishable, so missing detail can fall back to parents
without treating transient errors as permanent coverage gaps.

<!-- 2026-11-18: Implemented numerical tile transport and per-game caching
(step 3), including indexed availability, source identity, conjugate symmetry,
bounded requests/cache memory, and cancellation. -->

## Progressive Refinement Catalog

Refinement returns the current numerical frame immediately and loads justified
detail asynchronously for subsequent frames. Duplicate identity is the canonical
tile code and native sample `(i, j)`; equal numerical values alone do not justify
refinement. Both the first and subsequent pixels sharing a sample justify their
immediate child regions, including collisions crossing a child boundary. The
catalog reuses these regions in later frames, with bounded metadata and request
counts. Level-34 duplicates remain valid terminal output.

The nearest finite cached parent supplies a pixel while its justified child is
loading, missing, or sparse. Used tiles are pinned against cache eviction; when
cache capacity is fully pinned, refinement pauses within the existing memory
budget. Uncovered plane hits remain explicit for the calculation fallback in the
later frame-coloring pipeline. Obsolete requests and source changes cannot write
into previously returned frames or retain stale refinement paths.

<!-- 2026-11-18: Implemented progressive adaptive refinement (step 4), with
local duplicate-sample child selection, persistent bounded catalog, parent
fallback/pinning, maximum-depth termination, and asynchronous cancellation. -->

## Worker Frame Coloring

The numerical frame is completed with tile/parent samples and bounded zero-seed
calculation fallback before deriving one escaped/inner/outer palette across all
valid plane samples using `FractoColors`. Sky, horizon, and unknown pixels are
excluded from that palette and have explicit background colors. Limited or
unconverged calculations remain unknown; they are not substituted as valid tile
data. Fallback work progresses across stable frames with exact-coordinate
memoization and configurable per-frame work/iteration budgets.

Projection, refinement, calculation and RGBA coloring run in a dedicated worker.
Numerical storage and transferred RGBA buffers are reused. A main-thread session
keeps one active frame and one latest queued view, rejecting obsolete output.
Stage timing diagnostics and a repeatable CPU fixture guide resolution and
performance choices when integrating the page.

<!-- 2026-11-18: Implemented the worker frame-coloring pipeline (step 5), with
whole-frame SDK tone maps, bounded numerical fallback, reusable transferable
buffers, stale-frame rejection, and measured sampling/coloring optimizations. -->

## Gameplay Integration

The canvas fills the measured game content area below the existing controls and
settings. A completion-driven worker loop reads the current flight state without
per-frame React updates, paints each accepted frame, and recycles its RGBA storage.
Resize/fullscreen changes reject old geometry; blur/hidden pages pause rendering,
and unmount terminates the worker and listeners. Canvas/worker failures offer Retry.

Rendering starts with a 57600-pixel budget and adapts between 14400 and 518400
pixels toward 32ms frame cost while preserving the content aspect and available
display density. A short, at-most-16-iteration escape prefix fills ordinary
exterior plane samples immediately during motion; harder uncovered points retain
bounded, progressive fallback. This trades ray density for responsive control
when frame cost grows, without changing indicated flight state or tile depth rules.

<!-- 2026-11-18: Integrated and verified the game-page canvas (step 6), with
adaptive resolution, resize/fullscreen lifecycle, pause/resume and cleanup,
retry UI, continuous exterior fallback, production build and browser checks.
Successful native fullscreen remains limited by in-app browser permission. -->

## Canvas display modes

Display settings retain the adaptive full-area canvas as the default and offer
a persisted 640 × 480 pixels alternative. The fixed mode uses exactly 640×480
render pixels, independent of device density, and aligns the canvas top with the
bottom of the game title bar. It centers horizontally when space permits and
provides scrolling when the play area is smaller than the canvas.

<!-- 2026-11-18: Added the fixed 640×480 display mode and top alignment. -->
