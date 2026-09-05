# Tiles test tabs

This folder contains the independent tab implementations used by
`../TilesTest.jsx`. The parent page owns the tab selection, measures the
available page area, and dispatches the selected tab through
`render_test_tab()`. It subtracts the title and tab-header heights before
passing the resulting `width_px` and `height_px` values to the tab component.

The current tab structure is:

1. **Benchmarks** — rendered by `TestBenchmarks`.
2. **Animation** — rendered by `TestAnimation`.

The dispatcher includes a default case that logs an error if a persisted or
new tab index has no corresponding component implementation.

## Components

### `TestBenchmarks.jsx`

Owns benchmark-page state, including the loaded report, combine-results mode,
combination method, and legend visibility. It requests the latest benchmark
results from `TilesBackend`, renders the controls and chart, and receives only
the adjusted page dimensions from `TilesTest`.

### `TestAnimation.jsx`

Owns animation settings, frame state, playback direction, playback timer,
starting-point selection, loading behavior, transport controls, canvas
rendering, and animation statistics. It receives `width_px` and `height_px`
from `TilesTest`; layout adjustments for the title and tab bars remain the
parent page's responsibility.

## Utilities

### `BenchmarksUtils.jsx`

Contains benchmark-only constants and pure chart helpers. It groups fixtures,
extracts source and step identifiers, reduces timing outliers for interpolated
results, builds Chart.js datasets, computes the logarithmic-axis minimum, and
creates chart options and legend behavior. It does not own React state or
perform network requests.

## Adding a tab

Add the tab's text key and component, then add a switch branch in
`TilesTest.render_test_tab()`. Update the tab-label array and the persisted tab
range at the same time. Keep tab-specific state and helpers in the new class;
only shared page coordination and dimensions should remain in `TilesTest`.

## Development notes

The files are intentionally organized by feature rather than by file type.
When a tab grows beyond a manageable size, move reusable pure logic into a
feature utility module and keep the component responsible for state and
rendering. Any user-visible strings must be registered in the appropriate
text catalog, and settings should use the existing `AppSettings` definitions
when persistence is required.
