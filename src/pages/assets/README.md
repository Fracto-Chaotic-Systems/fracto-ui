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
  2 to 5000 across the shorter navigator edge, defaulting to 1000 for new settings.
  The existing `assets/simulator/terrain_resolution` preference now stores this
  minimum; previous values remain valid. Apply commits the numeric input.
  The viewer requests `GET /mesh_terrain`, then only the selected cached mesh files.
  No numerical raster request, mesh construction or smoothing runs in this path.
  The actual level, effective X/Y resolution, loaded mesh count, decoded-cache hits
  and loading/color-preparation time are displayed. Insufficient resolution and
  missing files are reported explicitly. The manifest caps a view at 64 canonical
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
  `SimulatorMeshScene.js` retains up to 64 GPU geometry/material entries, places
  tile instances, mirrors the lower half-plane and clips to the navigator region.
  Coordinates are normalized relative to the navigator to retain precision when
  zoomed in. Precomputed relief remains scaled to navigator scope / 25. Cached
  local-edge smoothing remains provisional; cross-tile seam repair is deferred.
  Gaps remain holes. Neither missing files nor insufficient resolution triggers
  on-demand construction. Reload refreshes the manifest and retries failed files.
  Camera orbit, pan, zoom, wireframe and lighting changes do not fetch terrain.
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
