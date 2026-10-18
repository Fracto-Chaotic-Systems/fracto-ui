# Seed-survey tab components and helpers

`AssetsSurveys.jsx` in the parent folder owns navigation, tab selection, and
splitter geometry. This folder owns the render and detect tabs and their helpers:

- `SeedSurveyDetect.jsx` places a left-aligned 550×550 canvas in the detect tab.
  It requests a 250×250 grid over half-span `1.5` with a `100K` iteration cap,
  using the navigator focal point. Its wrapper is an inline block with `0.5rem`
  margins and top alignment, allowing adjacent components. The panel scrolls
  when space is limited.
  Data loading, batching, and progress remain owned by `SeedSurveyCanvas`.
  Beside it, a 550×550 chart reuses circuitry's `click_point_chart` markers,
  radial guides, prominent axes, and shared image frame. Mouse positions map
  continuously to seed coordinates over `[-1.5, 1.5]` with imaginary values
  increasing upward. The chart starts at `(0, 0)` and resets there when the
  focal point changes. Hover computation is client-side using
  `FractoFastCalc.calc_from_seed` with the same 100K cap to obtain cardinality.
  By default, the chart and magnitude use `newton_big_complex` points, refined with
  that cardinality, the same starting seed, 10 Newton cycles, and 64-digit
  arithmetic. Empty Newton results never fall back to calculator points. Animation-frame
  coalescing keeps only the latest pointer position. Hover does not submit
  survey jobs. Escaped or unavailable orbits show the shared no-orbital message;
  estimated calculator results remain numerical candidates, not period proofs.
- `SeedSurveyRender.jsx` owns preview/render mode and persisted half-span and
  iteration-limit controls. It passes the focal point, numeric source/display
  sizes, half-span, iteration limit, and translated accessibility label to the
  canvas. It does not submit jobs or hold survey results. The header does not
  shrink; the remaining area scrolls in render mode and includes both the full
  image and its sample-count message. The page bounds the panel by the viewport
  space below its title, and tabs fill that space without estimated tab heights.
- `SeedSurveyCanvas.jsx` owns DataBackend submission and polling, survey and
  batch-cursor state, progress/error presentation, stale-response guards, and
  polling cleanup. It accumulates decoded or packed batches in its canvas cache
  and drains unread rows even after the server job completes. New focal-point
  coordinates, source size, half-span, iteration limit, sampling, or encoding
  restart the job and
  clear old data; display-only resizing preserves the job and source cache.
  Invalid focal points invalidate pending responses and leave an idle canvas.
  It has no preview/render mode or hardcoded size choices. Unmounting stops
  client polling and ignores late callbacks; it does not cancel the server job.
- `SeedSurveyCanvasBuffer.js` owns row accumulation, packed row decoding, the
  offscreen canvas cache, and SDK painting through `FractoCanvasBuffer` and
  `FractoColors`. Packed rows use absolute offsets; buffers are column-major.

`SeedSurveyRender.jsx` selects the source/display sizes (121/255 for preview,
1024/1024 for render) and obtains
mode-specific accessibility labels through `AppText`. It explicitly selects
`bounds`/`rows` for preview and `centers`/`packed` for render. The detect canvas
uses the general defaults of `bounds`/`rows`. `source_size_px` is sent as
`grid_size`, and `size_px` is sent as `canvas_size`; any independent integer
pair within data-service capacity is supported. Display-only resizing remains
local and does not restart the numerical job.

Legacy point-array responses and confidence/iteration histogram shading are no
longer supported. Preview requires `canvas_buffer` or `canvas_buffer_batch`;
high-resolution rendering uses packed `render_batch` rows. Missing data leaves
the canvas background or previously accumulated samples in place.

Run regressions from the UI repository with:

```powershell
node --test test/seed_survey_canvas.test.js test/seed_survey_render.test.js
```

While a job is queued, running, or still draining completed row batches, the
canvas footer shows a native progress bar aligned to the image's left edge and
width. After all available rows are received, it replaces the bar with
`${total_samples} samples complete`. Footer text and the progress label are
registered in `AssetsText.jsx`; failed jobs retain their error message.

The detect chart lists the seed, calculator `pattern` (candidate cardinality),
and magnitude below the plot. Magnitude is the maximum Euclidean distance of
the displayed orbital points from `calculate_cardioid_Q(c.x, c.y, -1)`, the same
Q used by its radial guides. Single-point orbits also use that Q. With no orbit,
magnitude is unavailable (`—`); escaped seeds retain pattern `0`. Magnitude is
computed at full numeric precision and displayed to ten significant digits.

`SeedSurveyCanvas.on_canvas_rendered(canvas)` runs synchronously after each
canvas paint, including streamed batches and display resizing. Callers can draw
overlays without changing the cached survey image. Detect uses this callback to
paint a white, four-pixel-radius dot with a one-pixel black outline at Q, using the same Q branch as its orbital
chart and mapping the survey's seed bounds with imaginary values increasing
upward. Repainting the overlay after each batch keeps it visible throughout loading.

While hovering, detect also paints white orbital dots of radius 1.5 pixels with one-pixel black square outlines
(4×4 pixels), from
exactly the selected point set displayed by the chart. It restores a snapshot of
the latest survey paint before updating overlays, so previous dots disappear
without new survey jobs. `on_seed_leave` clears hover overlays and pending pointer
updates while retaining Q and the last orbital chart. Streamed paints refresh the
snapshot and redraw current overlays. Q is drawn last, above all smaller orbital dots.

The radio buttons below the orbital chart select `newton` (default) or `legacy`.
Legacy displays `calc_from_seed()` orbital points; Newton displays its refined
points. Both use the same seed and calculator cardinality. Switching reuses the
computed data and updates the chart, magnitude, and hover dots together, without
submitting a survey job or falling back between methods when points are absent.

`SeedSurveyOrbitConfirmation.js` computes the cyclic complex product
`P = (A+B)(B+C)…(last+first)` from the selected chart points when magnitude is
strictly greater than 0.25. Confidence is `max(0, 1 - abs(abs(P) - 1))`, shown
as a percentage directly beneath the orbital chart, above seed, pattern, and magnitude. This compares product length, not angle:
any unit-length product scores 100%. Missing points, nonfinite products, and
magnitudes at or below the threshold show `—`. The score is a numerical
confirmation measure rather than a probability or proof of primitive period.

The line immediately below confidence shows `newton cycles` from the current
Newton solver result, or `—` when no Newton result exists. It remains explicitly
labeled as Newton metadata when viewing legacy points. The count is the reported
iterations performed, including runs that reached the iteration limit; it does
not by itself certify convergence.
