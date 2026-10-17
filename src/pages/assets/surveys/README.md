# Seed-survey tab components and helpers

`AssetsSurveys.jsx` in the parent folder owns navigation, tab selection, and
splitter geometry. This folder owns the render and detect tabs and their helpers:

- `SeedSurveyDetect.jsx` is the detect-tab component class scaffold. It receives
  `focal_point` (`{ x, y }`), `width_px`, and `height_px`, and currently renders
  an empty labeled block. Future detection controls, state, and jobs belong in
  this component.
- `SeedSurveyRender.jsx` owns preview/render mode and persisted half-span and
  iteration-limit controls. It passes the focal point, numeric source/display
  sizes, half-span, iteration limit, and translated accessibility label to the
  canvas. It does not submit jobs or hold survey results.
- `SeedSurveyCanvas.jsx` owns DataBackend submission and polling, survey and
  batch-cursor state, progress/error presentation, stale-response guards, and
  polling cleanup. It accumulates decoded or packed batches in its canvas cache
  and drains unread rows even after the server job completes. New focal-point
  coordinates, source size, half-span, or iteration limit restart the job and
  clear old data; display-only resizing preserves the job and source cache.
  Invalid focal points invalidate pending responses and leave an idle canvas.
  It has no preview/render mode or hardcoded size choices. Unmounting stops
  client polling and ignores late callbacks; it does not cancel the server job.
- `SeedSurveyCanvasBuffer.js` owns row accumulation, packed row decoding, the
  offscreen canvas cache, and SDK painting through `FractoCanvasBuffer` and
  `FractoColors`. Packed rows use absolute offsets; buffers are column-major.

`SeedSurveyRender.jsx` selects the source/display sizes (121/255 for preview,
1024/1024 for render) and obtains
mode-specific accessibility labels through `AppText`.

Legacy point-array responses and confidence/iteration histogram shading are no
longer supported. Preview requires `canvas_buffer` or `canvas_buffer_batch`;
high-resolution rendering uses packed `render_batch` rows. Missing data leaves
the canvas background or previously accumulated samples in place.

Run regressions from the UI repository with:

```powershell
node --test test/seed_survey_canvas.test.js test/seed_survey_render.test.js
```
