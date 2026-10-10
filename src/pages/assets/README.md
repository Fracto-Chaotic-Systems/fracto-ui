# Assets pages

This directory contains the panels selected from the Assets section sidebar.
`Assets.jsx` owns the section navigation and mounts one page panel at a time.

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
  right content pane by a persisted splitter. The right pane has a 35px header
  with mutually exclusive “preview” and “render” choices held in page-local
  state; preview is the default. The page starts one data-server job per
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
  locally. Its value is sent as `seed_iteration_limit` and caps each seeded
  `FractoFastCalc.calc_from_seed()` run when the focal parameter is outside the
  main cardioid; it does not alter the in-cardioid detector horizon. Worker
  tasks still have five-minute preview and one-hour render timeouts, so large
  limits can time out before all samples finish.
- `SeedSurveyPreviewCanvas.jsx` draws preview samples or render row batches
  from the data server. Pixel status 1 is a non-singleton candidate for which
  the server has a final pattern-sized suffix of orbit samples; it does not
  independently prove recurrence or distinctness. Status 2 is unresolved;
  status 3 escaped; status 4 is a nonzero `FractoFastCalc` pattern for a seed
  survey whose parameter lies outside the main cardioid; status 0 is otherwise
  unpainted. Status-1 candidates use the existing pattern hue and empirical
  confidence rank. Outside-cardioid preview and render surveys instead paint
  `[pattern, iteration]` pairs, including pattern-zero escapes, through SDK
  `FractoCanvasBuffer.buffer_to_canvas`, matching the navigator's
  `FractoColors` pipeline. In-cardioid preview and render retain diagnostic
  confidence and iteration coloring.
  These confidence and iteration histograms apply to the in-cardioid
  diagnostic painter. Confidence scores from status-1 pixels with finite values are mapped so the
  lowest 1% receives 18% HSL lightness, the highest 1% 88%, and intermediate
  ranks are spread evenly. Escaped and unresolved pixels do not affect this
  distribution. The confidence histogram has 4,096 bins. Escaped status-3
  pixels remain white and do not affect either histogram. Status-4 pixels use
  a separate iteration histogram: lower iteration percentiles are lighter and
  higher percentiles are darker. The mapped lightness is applied to the
  pattern's hue, matching the tile rendering color convention.

  The render protocol stores 13 little-endian bytes per pixel: `uint8` status,
  `uint32` pattern at byte 1, `float32` confidence at byte 5 (`-1` if absent),
  and `uint32` iterations at byte 9. Render row polling uses an `after_row`
  cursor and returns up to 16 rows. Rows are retained client-side so mapping
  changes can repaint the received prefix. The confidence scale is refreshed
  at ten row-progress milestones during rendering; rows between milestones use
  the last published scale. Completion computes the final distribution and
  repaints the whole image once to normalize all pixels together.
- `SeedSurveyConfidenceScale.js` builds the confidence histogram and maps
  empirical ranks to the 18–88% lightness range, clipping the bottom and top
  one-percent tails.
  Unresolved samples appear medium grey (`#888888`), while
  singleton/other/unprocessed samples remain `#eeeeee`.
- `SeedSurveyIterationScale.js` builds the status-4 iteration histogram and
  maps iteration percentiles to reversed 88–18% HSL lightness, so fewer
  iterations are lighter and more iterations darker. That lightness is applied
  to the pattern hue. Its 10,001 buckets cover zero through the current
  10,000-iteration seeded-calculator horizon. During rendering, this
  scale refreshes at the same ten progress milestones as the confidence scale;
  the final whole-image repaint normalizes both scales together.
- `SeedSurveyEscapeScale.js` is a legacy histogram helper retained for
  reference and tests; the canvas no longer uses it, and escaped samples remain
  white.
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
