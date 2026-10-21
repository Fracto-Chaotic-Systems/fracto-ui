# Shared rendering utilities

`FractoRasterImage.jsx` owns raster canvas lifecycle; `FractoCanvasClient.jsx`
requests and paints canvas buffers and reports completed buffer/context pairs.
`FractoUIColors.jsx`, `CanvasUtils.jsx`, and `ImageFrameStyle.jsx` provide shared
color, canvas, and frame behavior. `FractoLegend.jsx` is the small locator.
`FractoOrbitalChart.jsx`, `ScatterCharts.jsx`, `PolarCharts.jsx`, `PointUtils.jsx`,
and `PatternsUtils.jsx` supply point/pattern displays. Color-wheel components,
`ColorWheelUtils.jsx` and `styles/` support palette/field selection;
`FractoTileCoverage.jsx` displays tile coverage, and `AppErrorBoundary.jsx`
isolates rendering errors.

`FractoRayOverlay.js` projects already-centered complex points, clips ray paths,
and paints thin black outlines under a caller-supplied color (default white).
It draws exact fraction labels afterwards, as black text in white bordered
boxes near the canvas edge. Segment clipping keeps entire boxes inside the
image, including segments with both endpoints outside it. Callers own the
base-image restore and translate nonzero viewport focal points before painting.

Seed surveys retain their orbital-colored wrapper in
`pages/assets/surveys/SeedSurveyRayOverlay.js`; the minibrot context canvas uses
white unselected parameter rays and pattern-colored selected rays. The two planes have different mathematical meanings; see
[Milnor (2000)](https://numdam.org/item/AST_2000__261__277_0/) and
[Schleicher (2000)](https://numdam.org/item/AST_2000__261__405_0/), and the nearby
minibrot README for the parameter-ray pipeline.

The optional sixth `paint_canvas_rays` argument, `show_labels`, defaults to
true. The minibrot canvas passes false for its white background paths, then
paints the selected group with labels enabled. Other callers keep their
existing labels. Hiding labels suppresses both text and boxes while retaining
outlined paths and restoring the drawing context.

An optional per-ray `display_label` overrides the fraction text without changing
`angle.key` or geometry. Minibrot callers use exact exponential-denominator
labels in both the table and canvas; other callers keep their existing format.
Label measurement and edge clipping use the displayed string.
