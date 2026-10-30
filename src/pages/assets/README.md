# Assets pages

This directory contains the panels selected from the Assets section sidebar.
`Assets.jsx` owns the section navigation and mounts one page panel at a time.

The `surveys/` folder contains seed-survey canvas and compatibility scale helpers;
see [its README](surveys/README.md) for responsibilities.

## Files

- `AssetsOverview.jsx`, `AssetsSettings.jsx`, `AssetsStatus.jsx`, and
  `AssetsLogs.jsx` provide the standard overview, configuration, service-status,
  and log panels.
- `AssetsImageGenerator.jsx`, `AssetsImageGallery.jsx`, and
  `AssetsVideoGenerator.jsx` provide asset creation, browsing, and video tools.
- `AssetsDetector.jsx` and `AssetsSimulator.jsx` compose navigator-based asset
  tools with their own persisted frame and splitter settings.
- `AssetsSimulator.jsx` keeps the interactive 2D navigator on the left and a lazy-loaded
  cached-mesh terrain viewer on the right. Minimum resolution is an integer from
  2 to 5000 across the shorter navigator edge, defaulting to 1500.
  The `assets/simulator/base_terrain_resolution` preference stores this base
  minimum. Apply commits the numeric input.
  The viewer requests `GET /mesh_terrain`, then only the selected cached mesh files.
  No numerical raster request, mesh construction or smoothing runs in this path.
  The actual level, effective X/Y resolution, loaded mesh count, decoded-cache hits
  and loading/color-preparation time are displayed. Insufficient resolution and
  missing files are reported explicitly. The manifest caps the base selection at 256 canonical
  files; a lower level can be used to stay within this display budget.
  `SimulatorTerrain.jsx` coordinates requests, camera, lighting and resize;
  `SimulatorTerrainView.jsx` presents controls and progress. `SimulatorMeshLoader.js`
  owns one persistent worker, request sequencing, timeouts and cancellation.
  `SimulatorMesh.worker.js` fetches four files concurrently, verifies inventory
  checksums and mesh identities, and keeps up to 64 decoded tiles in an LRU cache.
  It renders colors from the standard SDK palette using shared visible-region
  histograms, preventing independently shaded tile boundaries. Parsing and color
  work stay off the UI thread; workers require OffscreenCanvas and native gzip
  decompression. Geometry is transferred only when absent from the GPU cache.
  `SimulatorMeshScene.js` retains every visible GPU geometry/material entry and
  keeps smaller views within a 64-entry reuse cache; it places
  tile instances, mirrors the lower half-plane and clips to the navigator region.
  Coordinates are normalized relative to the navigator to retain precision when
  zoomed in. Precomputed relief remains scaled to navigator scope / 25. Cached
  local-edge smoothing remains provisional. Same-level boundary heights are welded
  at render time; coarse/fine transitions remain deferred.
  Gaps remain holes. Neither missing files nor insufficient resolution triggers
  on-demand construction. Reload refreshes the manifest and retries failed files.
  Camera orbit, pan and zoom can fetch nearby refinement tiles; wireframe and
  lighting changes do not fetch terrain.
  Camera settings survive navigation and resolution changes; initial display,
  aspect changes and explicit top/oblique controls refit the camera.
  Optional lighting remains off by default, preserving unlit standard colors.
  Lighting settings persist in `assets/simulator/terrain_lighting`; shader-derived
  normals avoid additional vertex arrays. Progress uses the existing 40rem bar
  to the right of its description. Loaded geometry remains visible during loading.
  Unmount aborts requests, terminates the worker and disposes GPU resources.
  `SimulatorTerrainData.js`, `SimulatorTerrainLoader.js`, `SimulatorTerrain.worker.js`
  and `SimulatorTerrainSmoothing.js` retain the prior numerical-raster helpers for
  compatibility/testing; the simulator no longer invokes that construction path.
- `AssetsSurveys.jsx` is the seed-surveys page selected by the “surveys” sidebar
  item. It owns independent persisted frame and navigator splitter settings.
  It keeps the navigator in a left pane in both modes, separated from the
  right content pane by a persisted splitter. The right pane has “render” and
  “detect” tabs; “detect” mounts `surveys/SeedSurveyDetect.jsx`, a component class
  displaying a left-aligned 550×550 canvas backed by a 250×250 sample grid,
  beside a 550×550 circuitry-style orbital point chart driven by local
  Newton refinement on hover, using the same starting seed and the
  cardinality supplied by `calc_from_seed()`. Inside the
  “render” tab, a 35px header has
  mutually exclusive “preview” and “render” choices held in page-local state;
  preview is the default. `surveys/SeedSurveyRender.jsx` owns those controls,
  display options; `surveys/SeedSurveyCanvas.jsx` owns survey state, job
  requests, polling, batch cursors, and progress/error display. The page passes
  focal-point data and content dimensions. The canvas starts one data-server job per
  focal-point/resolution/half-span/iteration-limit combination and polls for
  progress. Changing the focal point, mode, or either slider starts a new job;
  scope-only navigation changes do not. A request ID
  prevents stale job responses from replacing the current image.
  Preview samples a 121×121 grid, including both bounds, and paints the results
  on a 255×255 canvas. The header's logarithmic “half-span” slider ranges from
  `2^-11` to `2^1`; the selected value bounds both axes from negative to
  positive half-span. It defaults to `1.5` and persists in browser-local
  `AppSettings`. Render samples 1024×1024 pixel
  centers across the selected bounds at `2 × half-span / 1024` spacing. It streams
  compact row batches, avoiding a million in-memory point objects; render can
  take substantially longer than preview. The logarithmic “limit” slider spans
  `10^5` to `10^10`, defaults to `100K`, displays K/M/G notation, and persists
  locally. Its value is sent as `seed_iteration_limit` to the SDK's seeded
  calculation path for survey samples. Worker
  tasks still have five-minute preview and one-hour render timeouts, so large
  limits can time out before all samples finish.
- `surveys/SeedSurveyCanvas.jsx` receives explicit source/display sizes, data,
  and accessibility text from `SeedSurveyRender.jsx`, which owns preview/render
  options. The general canvas coordinates its lifecycle and delegates
  all rendering to `SeedSurveyCanvasBuffer.js`. Samples are painted through
  the SDK's `FractoCanvasBuffer.buffer_to_canvas`, using the same
  `[pattern, iteration]` values and `FractoColors` mapping inside and outside
  the main cardioid. Pattern-zero escape samples retain their iteration count
  and receive the shared adaptive grey treatment; nonzero patterns use the
  shared pattern hue and iteration shading. The focal domain does not select a
  separate canvas renderer.

  The canvas owns request invalidation and clears its polling timer on unmount;
  switching tabs does not cancel already submitted server jobs.

  The render protocol stores 13 little-endian bytes per pixel: `uint8` status,
  `uint32` pattern at byte 1, `float32` confidence at byte 5 (`-1` if absent),
  and `uint32` iterations at byte 9. Render row polling uses an `after_row`
  cursor and returns up to 16 rows. Each packed render sample carries status,
  pattern, confidence, and iteration fields; the canvas decodes the pattern and
  iteration into the same 2D buffer used by preview before calling the shared
  renderer. Legacy point-array rendering and confidence/percentile histogram
  shading have been removed; all survey colors come from `FractoColors`.

- `AssetsLore.jsx` and `AssetsLoreStyles.jsx` provide lore content and style
  management.
- `AssetsUtils.jsx` contains shared helpers used by Assets panels.

The left navigator uses the shared `NavigatorSplitterLayout`. Page titles,
control labels, and sidebar labels are registered through `AssetsText.jsx`,
while page preferences and the pane splitter position belong in
`AssetsSettings.jsx`.

The detector's input contract, seeded versus critical-orbit behavior,
finite-precision evidence, and limitations are documented in the main
repository's `sdk/FractoCardinality.md`. The data-server README describes how
that result becomes preview records or compact render rows.

Selected survey orbitals support bounded numerical dynamic-ray tracing;
see [the ray documentation](surveys/RAYS.md). Its published theoretical basis
is [Milnor (2000)](https://numdam.org/item/AST_2000__261__277_0/) and
[Benini–Lyubich (2014), polynomial case](https://doi.org/10.5802/aif.2888).

For an unchanged region and identical mesh checksums, the worker also reuses the already-installed textures. Such reloads validate the manifest but skip file requests, decompression, palette calculation and geometry transfers. A changed region or source checksum invalidates this fast path.

Development verification (2026-10-28): overview minimum 1000 selected level 3, 13 files and 1281×1281 effective samples. Loading/color preparation took about 1.6–2.0 seconds cold; an unchanged reload reported 16ms. At scope 0.0861172966 the viewer selected level 7 and reported 706×706 with an unmet-1000 warning. Changing the minimum to 500 reused all eight files/textures in 9ms and cleared that warning. These are local observations excluding GPU frame-time guarantees.

Resolution fallback messages distinguish unavailable cached coverage from the 256-file display limit. The limit applies to canonical files, with mirrored placements sharing geometry. The former 64-file cap incorrectly forced a complete 3500-sample overview down to level 4.

### Camera-driven local refinement

The simulator now starts with a base minimum of 1500, persisted separately in assets/simulator/base_terrain_resolution. The prior terrain_resolution setting remains intact for compatibility and does not override the new base preference. SimulatorTerrainLod.js ranks visible nearby parent placements by camera-to-tile distance and projected sample size. At most eight physical patches refine by one level. Selection is throttled to 250ms, permits only one detail request at a time, and uses different enter/leave thresholds plus retention preference to avoid flicker. Camera changes during loading are reconsidered after completion.

The manifest supplies only complete ready child quartets. Parents remain displayed while children load, and each quartet swaps atomically; a failed child retains its parent and that patch is not repeatedly retried until the view/manifest reloads. Mirrored placements share file data but can refine independently. Moving away restores retained base geometry. Reload terrain refreshes child availability. The status reports base sampling and the number/level of refined nearby patches separately.

SimulatorMeshTextures.js fixes the tone mapping to the base view, extends it consistently for finer-only iteration values and caches up to 128 tile textures in worker memory. Per-entry GPU texture identities prevent stale colors when reusing offscreen geometry. The worker can reuse retained GPU parents without fetching evicted raw data; its small metadata cache retains up to 512 height records. Base geometry is protected from eviction while its children are shown, allowing prompt coarsening. The common normalized height scale remains scope/25 at every level. Runtime welding closes equal-level height discontinuities and stitches 2:1 coarse/fine borders without modifying cached geometry.

Development verification (2026-10-28): the 1500 base selected level 4 at 2561×2561 from 47 files with 66 ready refinement candidates. Zooming the camera close selected seven level-5 physical patches, using 65 canonical files in total. Pulling back restored all 47 base files in 5ms through reuse. This verification preceded equal-level runtime welding.

### Equal-level runtime welding

Flight simulator navigation uses TrackballControls for unrestricted rotation,
including rolling and passing over the poles to explore the double-sided terrain
from below. A lightweight animation callback processes controls; rendering and
LOD updates still occur on camera changes. Resize updates the trackball bounds,
and unmount cancels the callback. Top/reset oblique presets restore the camera's
upright orientation. Right-drag panning and wheel zoom remain available.

The simulator gear in the upper-right corner reveals controls, lighting, status,
progress and navigation help above the canvas. It becomes an × to close the panel.
Options start hidden on each mount and are not persisted. Toggling keeps the
canvas, camera and terrain mounted; resizing updates the rendering area and
trackball bounds. The toggle supports keyboard access and exposes expanded state.

The gear panel's navigation selector switches between **inspect** (default on
each mount) and **fly**. `SimulatorNavigation.js` disposes the previous controller
before creating TrackballControls or SimulatorFlightControls, preserving camera position,
orientation and roll. Returning to inspect places its pivot ahead of the current
camera at the retained inspection distance. Switching does not reload terrain.
Powered fly mode uses a small Three.js Controls implementation for continuous
camera-local forward motion. Throttle starts at 25%, with maximum speed 0.2
navigator scopes per second. W/S changes throttle at 25 percentage points per
second; up/down pitch, left/right bank, A/D yaw, Q/E roll, and dragging steers.
Banking gently contributes to turning. The gear panel includes throttle,
steering sensitivity (0.25–2×), and pause/resume. Keyboard Space toggles pause
without repeated toggles when held. Click the terrain to activate input; focus loss, Escape or window blur
recreates a paused, disabled flight controller to clear held keys, retaining
throttle and sensitivity. Switching modes retains those settings too. Pausing
freezes motion immediately, and resuming accelerates from rest. Presets pause
flight and remain usable in both modes. The animation callback supplies bounded elapsed seconds to flight
updates; normal camera-change events continue rendering and LOD selection.
Speed approaches its throttle target exponentially, with exact distance
integration for consistent frame-rate behavior. Steering rates ease over 150ms.
Zero throttle decelerates gently toward a hover. This is an exploration flight
model: aerodynamic lift, stalls, gravity, collisions and streaming beyond the
selected region remain subsequent work.

`SimulatorFlightMetrics.js` defines the maximum speed explicitly as **0.2
navigator scopes per second**. Scene coordinates are normalized by navigator
scope, so camera motion has the same relative pace at every magnification,
aspect ratio and mesh resolution. Physical distance per second is the current
normalized speed multiplied by the installed region's scope; no metre-based
geographic scale is assumed.

The fly-mode **show flight instruments** checkbox is off by default. Enabling it
adds an optional canvas overlay with throttle, speed (complex-plane units/s and
scope/s), signed altitude above the complex plane, and signed vertical terrain
clearance. Negative clearance means below the surface; it is not a nearest-point
distance or a collision constraint. Missing tiles/holes and positions outside
the clipped navigator region report no terrain. Readings refresh at most four
times per second, with no surface sampling while disabled.

`SimulatorTerrainSurface.js` samples only candidate visible tile triangles under
the camera's X/Z, respecting omitted triangles, reflected placements and height
scaling. Triangle participation is cached weakly per geometry. Welding exposes
its existing RG edge overrides to the sampler, which follows the shader's corner
precedence and collapsed 2:1 boundary positions. Sampling neighboring grid cells
accounts for transition triangles crossing their original cell bounds. No full
raycast or extra copy of mesh positions is required.

Active powered flight supplies actual normalized speed to the LOD selector.
`SimulatorTerrainLod.js` predicts two seconds along the camera's forward motion,
with a maximum 0.4-scope lookahead. It evaluates the future viewing frustum and
flight corridor, using projected distance and sample density. Up to two of the
eight nearby-detail slots may be used for predictive-only patches; the other
slots prioritize the current visible terrain. Inspect, pause, lost focus and
zero speed disable prediction. Above/below and rolled flight share the same
three-dimensional selection rules. Only indexed complete child quartets within
the selected navigator region are candidates; this does not stream new regions.

Selection still runs at most every 250ms and permits one detail request at a
time. Camera/flight changes during a request queue reevaluation of the latest
pose, rather than overlapping loads. Failed quartets remain suppressed until
navigation resets. Existing terrain stays displayed while replacement data
loads; complete child groups replace parents atomically, and parents remain on
missing/failed child reads. Retained parent geometry enables quick coarsening.
Welding/stitching runs for each assembled layout, including predictive detail.

Flight is confined to the installed navigator region's horizontal footprint:
normalized X spans ±0.5, Z spans ±aspect/2. `SimulatorFlightRegion.js` handles
start poses, region identity, warnings and first-edge segment clipping. An
inspection pose already inside the region (including below or inverted) is
preserved when entering fly mode. An outside overview starts at X=0, altitude
0.08 scope, and Z=min(0.25, aspect/4), facing forward. This is above the scope/25
height cap. Flight cannot activate until the base terrain has loaded.

Warnings appear within 8% of the shorter edge or when the two-second flight
projection would leave the footprint. Crossing an edge stops the movement
segment just inside the first crossed boundary and pauses flight, preserving
orientation. The warning and return-to-start action remain accessible with the
gear panel closed. The gear panel also includes return to start. Return restores
the saved position, orientation and roll and leaves flight paused; nearby LOD
can refresh, but it does not reload or change the navigator region. Inspect
mode remains unrestricted so the user can turn back before resuming flight.

Changing focal point, scope or aspect clears the old flight start and pauses
flight. A new region establishes a fresh start if fly mode is selected. Reloads
or resolution-only changes retain the start and current camera pose. Altitude
is unrestricted and no terrain collisions are enforced, allowing underside
exploration. Neighbor-region streaming remains a separate future feature.

The escape relief multiplier is fixed at **100×** by
`ESCAPE_RELIEF_MULTIPLIER` in `SimulatorEscapeRelief.js`; there is no UI control
or persisted setting. Both base and nearby-detail loads use this constant,
regardless of any legacy stored preference. The height reconstruction uses the
original pattern/iteration arrays carried by each cached mesh: only pattern 0
(escaped) iterations are multiplied, before log1p mapping, the normalized cap of
1, and radius-four Gaussian smoothing. The wider kernel rounds the larger
escape/pattern steps created by boosting escape iterations, and applies uniformly
across the height grid.
Constant pattern interiors retain their original
heights; the shared smoothing pass blends the immediate interface. The world
height cap remains navigator scope / 25. Original numerical samples, palette,
UVs, indices and stored files remain unchanged; no mesh regeneration is needed.
Runtime geometry/cache identities include the multiplier so refinement,
coarsening cannot reuse heights from another profile. Requests reuse the bounded
worker/GPU caches. The height cap can produce plateaus.

SimulatorTerrainEdges.js extracts each native mesh’s 257-sample edges and triangle participation once. It locates visible same-level neighbors with exact integer quadtree addresses, including independently placed conjugate tiles. Shared edge interiors receive the same averaged height; all valid tiles meeting at a corner share one corner average. Missing neighbors and boundary vertices unused by triangles are left unchanged. Different levels are deliberately excluded.

SimulatorTerrainWelding.js applies boundary overrides through a small per-placement RG float texture (about 8 KiB) in the vertex shader. Native positions, UVs, indices, stored mesh files and color textures remain unchanged. This avoids copying full geometry buffers and permits a mirrored instance to have different neighbors. Material overrides preserve the existing lighting shader and scope/25 scaling. Conservative per-object bounds include displaced vertices for frustum culling. Overrides are reused when the visible layout is unchanged, updated when neighbors change during refinement/coarsening, and disposed when no longer needed. Wireframe and lighting remain functional. No cache rebuild is required. Intentional data holes remain open.

SimulatorTerrainTransitions.js follows equal-level welding with 2:1 boundary stitching. Fine boundary vertices snap to the authoritative coarse edge; odd vertices collapse onto the preceding even vertex, eliminating T-junctions rather than only matching interpolated heights. Fine corners propagate to every fine tile sharing that corner. Boundary triangle connectivity prevents collapsing across missing-data segments. Reflected placements use physical edge orientation. This supports the current one-extra-level LOD system; larger adjacent level differences require additional transition rules.

Development verification (2026-10-29): the native level-4 overview rendered with equal-level runtime welding, standard colors and optional lighting, with no WebGL shader errors. Subsequent unit coverage verifies 2:1 transition coordinates and heights in every direction, reflected instances, shared corners, missing boundary segments, GPU override restoration and original-buffer immutability.
