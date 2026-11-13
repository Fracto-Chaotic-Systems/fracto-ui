# Fracto UI pages

This directory contains the routed application areas and the feature components rendered inside them. `App.jsx` owns the top-level routes; the page components here own each area's sidebar, section selection, splitter layout, and feature composition.

## Routed areas

- `Admin.jsx` (`/admin`) - accounts, repository Reference documents, overview scaffold, commits, social documents, servers, AI chat, health/status, logs, and browser-settings inspection.
- `Data.jsx` (`/data`) - data-service overview, queries, status, logs, and connection/settings forms.
- `Assets.jsx` (`/assets`) - asset overview/status, image generation and gallery tools, lore content, video generation, a seed-survey navigator with an incremental preview pane, logs, and settings.
- `Tiles.jsx` (`/tiles`) - tile overview/status, inspection, test harness, generation, logs, and settings.
- `Games.jsx` (`/games`) - blank Overview, Settings, and Status panels, plus an abstract-noun tree and synset details on the wordnet reference page with sidebar separators above and below wordnet, a `worlds` mapping table and contender tray titled `all worlds`, and a `music` item opening `All Music` with local MIDI file selection, piano playback, transport controls and status/error messages.
- `Study.jsx` (`/study`) - fractal studies including points, minibrots, nodes, inline studies, meridians, circuitry, fields, overview, status, and settings. The `full map` sidebar item opens a title-only page scaffold titled `logistic map`.

Each top-level page follows the same broad pattern: read the selected section from `AppSettings`, resolve display labels through `AppText`, render a sidebar, and mount the selected child panel inside `SplitterLayout`.

The [feature catalog](../features/README.md) records the exact current labels,
page titles and implementation states. In particular, data Overview is a legacy
data-backups placeholder; tile Inspector and several Settings/Status panels are
placeholders; games Overview/Settings/Status render no right-pane component.
The catalog distinguishes those destinations from completed workflows and is
checked against the route/sidebar/settings registrations before npm builds.

## Directory guide

- `admin/` contains panels for the admin page.
- `admin/AdminReference.jsx` renders tracked Markdown documents from the fixed repository allowlist. The admin service exposes the tree and document endpoints; the UI persists the selected repository and path.
- `assets/` contains asset panels plus gallery, lore, detector, simulator, seed-survey preview canvas, and video subcomponents.
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

Games wraps its sidebar controller with router search parameters so theme synset
links can open the WordNet reference directly. See games/README.md for details.

The `play` sidebar item below `music` opens a blank panel titled `game play`.

Games also accepts `?card=N` to open all worlds and reveal its requested row
after the database mappings load.
