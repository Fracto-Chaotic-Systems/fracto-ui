# Navigator components

The navigator is the shared fractal-viewer workspace used by study, tile, and other exploratory pages. It coordinates a rendered field, navigation controls, coverage information, legends, and optional history/step panes. Components here are presentation and interaction layers; service requests and raster generation are delegated to the backend and render utilities.

## Layout and data flow

`NavigatorPageLayout` and `NavigatorCoverage` are the two entry layouts. Both measure the available viewport and subscribe to application settings, then pass dimensions and splitter configuration to `NavigatorSplitterLayout`.

`NavigatorSplitterLayout` arranges the main regions and persists their splitter positions through `AppSettings`:

- `NavigatorSteps` shows saved/previous render steps and can restore a frame.
- `NavigatorField` owns the visible raster canvas, translates pointer/zoom actions into frame-setting updates, and reports completed canvas buffers.
- `NavigatorLegend` displays point details, color controls, clipboard/send-to actions, and zoom/transit controls.

`NavigatorLegendTabs` adds the orbital and patterns views associated with a rendered field. `NavigatorTransit` draws the directional transition overlay used to move between nearby regions. `NavigatorCoverage` additionally renders tile coverage and periodically refreshes its measured region (about once per second).

The usual event path is:

1. A page supplies frame settings and callbacks to a navigator layout.
2. `NavigatorField` renders the frame through `FractoRasterImage` and publishes updated canvas data/settings through `AppSettings` and callbacks.
3. Pointer, keyboard, splitter, or legend actions update navigator settings.
4. The owning page observes those changes and requests the next raster/coverage result.

## File guide

- `NavigatorPageLayout.jsx` — viewport-aware layout for pages that need the navigator without tile-coverage presentation.
- `NavigatorCoverage.jsx` — viewport-aware layout that includes `FractoTileCoverage` and coverage callbacks.
- `NavigatorSplitterLayout.jsx` — three-pane splitter composition and splitter persistence.
- `NavigatorField.jsx` — canvas sizing, raster display, mouse interactions, zoom, and crosshair rendering.
- `NavigatorSteps.jsx` — step/history thumbnails and frame restoration.
- `NavigatorLegend.jsx` — frame metadata, controls, colors, clipboard, and transit entry points.
- `NavigatorLegendTabs.jsx` — orbital and pattern legend tabs.
- `NavigatorTransit.jsx` — canvas-drawn directional transition regions and hover/click handling.
- `NavigatorKeys.jsx` — splitter-key maps shared by asset, video, tile, and study layouts.
- `NavigatorUtils.jsx` — reusable crosshair, pointer, and small navigator rendering helpers.

## Shared state and props

Navigator components use `AppSettings` rather than a private global store. Definitions and keys live in `settings/NavigatorSettings.jsx` and related feature settings; root viewport dimensions and clipboard values come from `settings/RootSettings.jsx`. Text labels come from `text/NavigatorText.jsx`.

When embedding a navigator, follow the PropTypes declared by the entry component. In particular, provide a frame-settings object with a focal point, scope, dimensions, and any rendering data expected by the field/legend, plus callbacks for coverage or frame updates where required. Treat callback payloads as the integration boundary: pages own fetching, persistence, and navigation state.

## Interaction details

`NavigatorField` recalculates its canvas when the supplied bounding rectangle changes. Zoom actions use the navigator's predefined minor/major factors and update the focal point and scope through settings callbacks. `NavigatorTransit` maps pointer coordinates to one of its precomputed directional regions; changes to its canvas width require rebuilding the region geometry.

Splitter positions are feature-specific keys passed into `NavigatorSplitterLayout`. Do not hardcode a new splitter location in a child component; add or reuse a setting definition so the layout remains responsive and persisted behavior stays consistent.

## Extension guidance

Keep fractal drawing and raster conversion in `utils/render/`; keep backend calls in `backend/`. Add reusable controls to `utils/ui/` and navigator-specific styling to `styles/NavigatorStyles.jsx`. If a new page needs a navigator variant, prefer composing the existing layouts and passing splitter keys over duplicating the field/legend implementation.

The components use both class and functional React patterns and rely on browser canvas APIs. Preserve the existing `.jsx` import extensions and clean up `AppSettings` subscriptions or timers in `componentWillUnmount` when adding long-lived behavior.

## Validation

Run the UI checks from `servers/fracto-ui/`:

```powershell
npm run lint
npm run build
```

For interaction changes, manually verify resizing, splitter dragging, zoom/pan actions, transit hover/click behavior, canvas redraws, and restoration of any persisted navigator settings.
