# Page utilities

This directory contains shared page-level components and workflows used by
multiple application areas. It sits between the general UI building blocks in
`src/utils/ui` and feature-specific page implementations.

## Files

- `AutomationEngine.jsx` defines the page-independent automation operation
  registry and engine. It sequences registered operations and owns lifecycle
  state such as running, paused, completed, failed, cancelled, retry, progress,
  and checkpoint behavior. Pages provide the actual work through registered
  operation definitions.
- `AutomationEngine.md` documents the engine integration contract, shared
  operation registration, cancellation and checkpoint expectations, and the
  current Tiles integration boundary.
- `AutomationOperationLibrary.jsx` contains reusable page-independent
  operations for the engine. It currently provides a namespaced, cancellable
  countdown operation and helpers for registering common operations without
  colliding with page-specific names.
- `Coverage.jsx` requests tile coverage for the supplied frame settings and
  displays the returned coverage status. It refreshes the result when those
  settings change.
- `InputForm.jsx` renders a form from setting-backed entry definitions. It
  initializes values from `AppSettings`, handles typed input, and saves
  updates through the shared settings API.
- `MeridianChart.jsx` renders the Study meridian visualization as a scatter
  chart, using the selected frame and point data.
- `PageAutomation.jsx` provides the shared page scaffold for operator,
  automation, and manager modes. It namespaces and persists the selected mode
  for the calling feature and notifies that feature when the mode changes.
- `PatternsUtils.jsx` computes chart-ready pattern, iteration, escape-point,
  and polar-coordinate data for Study visualizations.
- `SendTo.jsx` lets a user route the current frame settings to another
  supported feature, such as tile generation, image generation, detector,
  lore image, or Study circuitry. It updates that destination's settings and
  selected section.
- `Sidebar.jsx` renders a page's configured sidebar list, including section
  selection and optional labeled dividers, using text keys from `AppText`.
- `SplitterLayout.jsx` lays out a page's left and right panes with a draggable
  splitter. It adapts the split to viewport size and persists its position
  through `AppSettings`.

The automation engine is intentionally separate from page-specific work: a
feature owns its job data and operation implementations, while the shared
engine handles sequencing and lifecycle. See `AutomationEngine.md` for the
contract and extension guidance.
