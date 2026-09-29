# UI utilities

`src/utils` contains reusable application helpers, Fracto rendering and math
code, and general-purpose UI components. Feature pages compose these modules
instead of implementing common rendering, controls, and data presentation on
their own.

## Top-level utilities

- `auth_callback_error.js` consumes the `auth_error` callback query marker,
  removes it from the browser URL, and reports whether one was present. The
  provider's raw error text is not displayed.
- `ComplexQuarternary.jsx` represents and operates on complex values in a
  base-four/quaternary form, including conversion between complex coordinates
  and the fixed-precision digit representation.
- `console_render.jsx` formats log records for the UI, including relative
  timestamps, time gaps, search highlighting, and loading the selected
  service's log data.
- `DatabaseDate.js` parses database timestamps while preserving explicit
  timezones and interpreting timezone-free SQL date-times as local time.
- `Dom.jsx` holds browser and display helpers: viewport size, JSON copying,
  generated IDs, numeric rounding, clipboard copy/paste, coordinate display,
  scalar formatting, and the `NumberSpan` component.
- `service_origin.jsx` is a compatibility re-export of the service-origin
  resolver from `service_ports.jsx`.
- `service_ports.jsx` discovers the installation's service-port map from the
  admin service and builds same-host origins for backend clients. The direct
  UI ports `3006` and `3106` connect directly to backend service ports in both
  development and production builds. Other UI origins use same-origin nginx
  `/api/` routes, as in the public deployment.
- `service_ports_mode.js` selects direct backend-port access for the two local
  UI ports and same-origin proxy access for other UI origins.

## Rendering utilities (`render/`)

- `AppErrorBoundary.jsx` catches rendering errors below its React boundary and
  replaces the failed view with a controlled error message.
- `CanvasUtils.jsx` draws standard loading/status text into a canvas.
- `ColorWheelUtils.jsx` provides color-wheel math and canvas drawing helpers.
- `FieldsColorWheel.jsx` renders the field-analysis color wheel UI.
- `FractoCanvasClient.jsx` adapts the Fracto SDK canvas renderer to app
  settings and tile-server requests, then paints the returned buffer.
- `FractoColorWheel.jsx` renders and manages the interactive Fracto color
  wheel.
- `FractoLegend.jsx` displays the legend for a rendered Fracto image.
- `FractoOrbitalChart.jsx` renders an orbital chart and its background-image
  plugin.
- `FractoRasterImage.jsx` coordinates a raster image render, color handling,
  and loading state for UI components.
- `FractoTileCoverage.jsx` calculates and displays tile-coverage information
  for a selected frame and reports the result to its parent.
- `FractoUIColors.jsx` provides Fracto-specific color conversion, palette, and
  pattern-color helpers.
- `ImageFrameStyle.jsx` exports the shared default style object for framed
  images.
- `PatternsUtils.jsx` contains pattern/iteration chart calculations and
  transforms, including escape-point and polar-coordinate data processing.
- `PointUtils.jsx` calculates point-set cycles, orbital and escape sets,
  magnitudes, and related point-analysis data.
- `PolarCharts.jsx` builds and manages polar charts.
- `ScatterCharts.jsx` builds and manages scatter charts.
- `render/styles/ColorWheelStyles.jsx` defines styled components used by the
  color-wheel rendering controls.

## Reusable UI components (`ui/`)

- `CoolButton.jsx` provides shared button and icon-button components.
- `CoolCanvas.jsx` wraps canvas drawing in a React component.
- `CoolColors.jsx` defines common UI color constants.
- `CoolDropdown.jsx` provides a reusable dropdown menu.
- `CoolEditor.jsx` provides an editable text/code surface with change handling.
- `CoolGrid.jsx` renders configurable grid data, including typed cell values.
- `CoolIcons.jsx` exports reusable inline SVG icons for controls, trees,
  copying, media transport, and waiting states.
- `CoolImage.jsx` displays an image through a magnifier component, with
  configurable width and zoom factor.
- `CoolImports.jsx` is a barrel module that re-exports commonly used UI
  components, styles, and wait-icon helpers.
- `CoolInputText.jsx` provides a styled text input with the app's common input
  behavior.
- `CoolMediaTransport.jsx` supplies begin, reverse, pause, play, and end
  controls for media playback.
- `CoolModal.jsx` provides a modal dialog with open/close behavior.
- `CoolNotes.jsx` provides a notes editor/view with its associated editing
  behavior.
- `CoolSelect.jsx` wraps a native select control for consistent UI use.
- `CoolSlider.jsx` provides the shared range slider control.
- `CoolSplitter.jsx` implements resizable horizontal or vertical panes in
  absolute or flow layouts.
- `CoolTable.jsx` renders configurable data tables with supported cell types,
  sorting, and selection behavior.
- `CoolTabs.jsx` provides a reusable tab strip and selected-tab behavior.
- `CoolTree.jsx` normalizes hierarchical data and renders an expandable,
  selectable tree with optional search and editing.
- `CoolWindowListener.jsx` registers and cleans up browser window event
  listeners through a React component.
- `LogViewer.jsx` renders service log records with timestamp, search, and
  display controls.
- `WaitIcon.jsx` provides rotating wait icons and their wrapper and timing
  constants.
- `cool.css` contains the base CSS rules shared by the legacy Cool UI
  components.

## UI styles (`ui/styles/`)

- `CoolModalStyles.jsx` defines the modal backdrop, panel, and related layout.
- `CoolStyles.jsx` provides base block/inline-block components and reusable
  CSS fragments for alignment, typography, borders, shadows, and inputs.
- `CoolTableStyles.jsx` defines table cell types, alignment and table options,
  and the styled table primitives.
- `CoolTransportStyles.jsx` styles the media transport controls.
- `CoolTreeStyles.jsx` defines the styled tree nodes, labels, and controls used
  by `CoolTree.jsx`.
- `CoolTreeStyles.css` supplies the underlying tree library's CSS rules.
- `MarkdownStyles.jsx` provides styled Markdown elements for headings,
  paragraphs, lists, links, code, blockquotes, tables, and documents.
- `SettingStyles.jsx` exports shared label styling for settings controls.
- `Styled.jsx` renders children in an inline-block `div` and forwards supplied
  props, including its optional `basis` prop, to that wrapper.
