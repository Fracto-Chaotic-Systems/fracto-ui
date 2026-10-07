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
  state. Preview starts the orbital seed survey for the navigator's current
  focal point and paints stable candidates and unresolved samples in a 255×255
  canvas spanning `[-1.5, 1.5]` on both axes. Render starts a separate
  1024×1024 survey. Pixel-center seed coordinates are spaced by `3/1024` across
  the same bounds. Compact row batches stream to the canvas, avoiding a million
  in-memory point objects. Render can take substantially longer than preview.
  Both modes rerun when the focal point or mode changes, not when scope changes.
- `SeedSurveyPreviewCanvas.jsx` draws preview samples or render row batches
  from the data server. Stable-candidate confidence is mapped by its empirical
  distribution: the lowest 1% maps to 18% HSL lightness, the highest 1% to 88%,
  and intervening percentile ranks map evenly between them. A 4,096-bin
  confidence histogram supports incremental render updates. Escaped and
  unresolved samples are excluded from this distribution. Render keeps compact
  pixel records containing status, pattern, confidence, and iteration count,
  and separate confidence and escape-iteration distributions. It repaints
  received rows when either distribution changes so they use one consistent
  current mapping; it applies the completed distributions to the full canvas
  at the end. It logs a diagnostic for each newly painted
  render row, including backing/display dimensions, the active distribution
  size, row confidence statistics, and counts by pixel status. A separate
  diagnostic records the batch that changed the distribution and the rows
  repainted under the updated mapping.
- `SeedSurveyConfidenceScale.js` builds the confidence histogram and maps
  empirical ranks to the 18–88% lightness range, clipping the bottom and top
  one-percent tails.
  Unresolved samples appear grey. Escape-iteration percentile shading is
  retained but currently disabled by `ENABLE_ESCAPE_ITERATION_SHADING`; escaped
  samples therefore render white. When enabled, they are ranked by escape
  iteration across the image: the lowest 1% map to light grey, the highest 1%
  to dark grey, and intervening percentile ranks are distributed evenly.
  Unprocessed/single-point samples remain `#eeeeee`.
- `SeedSurveyEscapeScale.js` builds the escape-iteration histogram and maps
  iteration percentiles to reversed 88–18% HSL lightness so lower counts are
  lighter and higher counts darker. Its 4,097 buckets represent iteration
  counts from zero through the survey's current 4,096-iteration horizon.
- `AssetsLore.jsx` and `AssetsLoreStyles.jsx` provide lore content and style
  management.
- `AssetsUtils.jsx` contains shared helpers used by Assets panels.

The left navigator uses the shared `NavigatorSplitterLayout`. Page titles,
control labels, and sidebar labels are registered through `AssetsText.jsx`,
while page preferences and the pane splitter position belong in
`AssetsSettings.jsx`.
