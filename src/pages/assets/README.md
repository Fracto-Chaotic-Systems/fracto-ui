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
- `AssetsSurveys.jsx` is the seed-surveys page selected by the “surveys” sidebar
  item. It owns independent persisted frame and navigator splitter settings.
  It keeps the navigator in a left pane in both modes, separated from the
  right content pane by a persisted splitter. The right pane has “render” and
  “detect” tabs; “detect” mounts `surveys/SeedSurveyDetect.jsx`, a component class
  displaying a left-aligned 350×350 canvas backed by a 150×150 sample grid. Inside the
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
