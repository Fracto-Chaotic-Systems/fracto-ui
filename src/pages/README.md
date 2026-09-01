# Fracto UI pages

This directory contains the routed application areas and the feature components rendered inside them. `App.jsx` owns the top-level routes; the page components here own each area's sidebar, section selection, splitter layout, and feature composition.

## Routed areas

- `Admin.jsx` (`/admin`) - service identification, overview, status, versions, logs, and administrative settings.
- `Data.jsx` (`/data`) - data-service overview, queries, status, logs, and connection/settings forms.
- `Assets.jsx` (`/assets`) - asset overview/status, image generation and gallery tools, lore content, video generation, logs, and settings.
- `Tiles.jsx` (`/tiles`) - tile overview/status, inspection, test harness, generation, logs, and settings.
- `Study.jsx` (`/study`) - fractal studies including points, minibrots, nodes, inline studies, meridians, circuitry, fields, overview, status, and settings.

Each top-level page follows the same broad pattern: read the selected section from `AppSettings`, resolve display labels through `AppText`, render a sidebar, and mount the selected child panel inside `SplitterLayout`.

## Directory guide

- `admin/` contains panels for the admin page.
- `assets/` contains asset panels plus gallery, lore, detector, and video subcomponents.
- `data/` contains data-service panels such as logs, overview, settings, and status; query administration is in `admin/AdminQueries.jsx`.
- `study/` contains study panels and specialized implementations for fields, magnitudes, meridians, minibrots, and points.
- `tiles/` contains tile panels and the tile generator's control, progress, context, history, and operation components.
- `utils/` contains page-level layout and interaction helpers: `Sidebar`, `SplitterLayout`, forms, coverage, charts, send-to actions, and shared page utilities.
- `PageUtils.jsx` contains viewport/splitter dimension calculations shared by page panels.

The lowercase feature directories are intentionally separate from their top-level page components. A page component decides which feature to show; the feature component owns that feature's data loading and controls.

## Composition and state

Page components are mostly class components and use `AppSettings` for selected sections, splitter positions, viewport dimensions, and feature preferences. Setting definitions live under `../settings/`; labels and content keys live under `../text/`. When a page is mounted, `App.jsx` has already initialized those registries.

Use the shared layout primitives when adding a panel:

1. Add a section key and default to the relevant settings file.
2. Add its title/content keys to the relevant text file.
3. Import the child panel in the top-level page and add it to that page's section map.
4. Use `Sidebar` and `SplitterLayout` conventions so the panel responds to viewport and persisted splitter changes.
5. Keep service requests in `src/backend/` and reusable rendering/controls in `src/utils/` rather than coupling them to the page container.

Feature panels should communicate with parents through explicit props and callbacks. Avoid duplicating global settings or placing endpoint construction in a page component. For fractal views, compose the shared navigator from `src/navigator/`; for raster, chart, and color output, use the render utilities under `src/utils/render/`.

## Special feature groups

The study area is the most composition-heavy page. Its field views use the navigator and canvas/raster utilities; minibrot views combine list, left/right detail panels, and bailiwick publishing; meridian, circuitry, magnitude, and point views provide focused charts and tables. The tiles generator similarly uses a context/active-state/history workflow and can perform tile writes through `TilesBackend`.

Asset lore components support structured content types under `assets/lore/content/`; keep new content renderers in that directory and route data access through `AssetsBackend` or `DataBackend`.

## Conventions and boundaries

Use `.jsx` extensions in imports and follow the local mix of class and functional components. Declare required callback and data shapes with PropTypes where the surrounding component does so. Clean up timers, subscriptions, and listeners in `componentWillUnmount` when adding lifecycle behavior.

Pages run in the browser and depend on backend services being available. Do not assume a successful fetch: preserve loading and error states in data-driven panels. See `src/backend/README.md` for service-origin and response conventions.

## Validation

From `servers/fracto-ui/`, run:

```powershell
npm run lint
npm run build
```

For page changes, manually check the affected route, sidebar selection, browser back/forward behavior, splitter resizing, persisted settings, and any backend-driven loading or error state.
