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
  focal-point/resolution pair and polls for progress. Changing the focal point
  or mode starts a new job; scope-only navigation changes do not. A request ID
  prevents stale job responses from replacing the current image.
  Preview samples a 121×121 grid at 0.025 spacing, including both bounds
  `[-1.5, 1.5]`, and paints the results on a 255×255 canvas. Render samples
  1024×1024 pixel centers across the same bounds at `3/1024` spacing. It streams
  compact row batches, avoiding a million in-memory point objects; render can
  take substantially longer than preview.
- `SeedSurveyPreviewCanvas.jsx` draws preview samples or render row batches
  from the data server. Pixel status 1 is a non-singleton candidate for which
  the server has a final pattern-sized suffix of orbit samples; it does not
  independently prove recurrence or distinctness. Status 2 is unresolved;
  status 3 escaped; status 0 is singleton or other/unpainted. Non-singleton
  candidates use the existing pattern hue and empirical confidence rank.
  Confidence scores from status-1 pixels with finite values are mapped so the
  lowest 1% receives 18% HSL lightness, the highest 1% 88%, and intermediate
  ranks are spread evenly. Escaped and unresolved pixels do not affect this
  distribution. The confidence histogram has 4,096 bins.

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
  Unresolved samples appear grey (`#888888`), escaped samples white
  (`#ffffff`), and singleton/other/unprocessed samples remain `#eeeeee`.
- `SeedSurveyEscapeScale.js` builds the escape-iteration histogram and maps
  iteration percentiles to reversed 88–18% HSL lightness so lower counts are
  lighter and higher counts darker. Its 4,097 buckets represent iteration
  counts from zero through the survey's current 4,096-iteration horizon. This
  mapping is retained but disabled by `ENABLE_ESCAPE_ITERATION_SHADING`; while
  disabled, escaped pixels are white and escape percentiles do not trigger
  canvas recoloring.
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
