# fracto-ui

React and Vite user interface for exploring Fracto services, tiles, assets, studies, and administrative status. The development server listens on port 3006 and communicates directly with the backend services on ports 3002 through 3005.

## Repository layout

This is an independent Git repository expected at `fracto/servers/fracto-ui/`. Source files import `../../constants.js` and `../../config/network.json` from the root repository, so moving the UI outside that layout breaks both development and production builds.

Commit UI files from this repository. Commit shared constants, network configuration, supervisor scripts, and SDK changes from the root repository.

## Requirements

- Node 22, the validated runtime.
- The root Fracto repository and its shared configuration files.
- Backend services required by the feature being used:
  - data server on port 3002;
  - asset server on port 3003;
  - tile server on port 3004;
  - admin server on port 3005.
- A modern browser with JavaScript and local storage enabled.

The UI uses native ES modules and React 19.

## Installation

From the root repository:

```powershell
npm ci --prefix servers/fracto-ui
```

Or from this directory:

```powershell
npm ci
```

## Starting the UI

Preferred full-system startup from the root repository:

```powershell
npm run start:check
npm start
```

The root startup process updates all repositories before launching services. It also requires a current compiled tile index; build that separately when instructed:

```powershell
npm run tiles:index
```

Start only the UI through the root launcher:

```powershell
node scripts/launch_service.js fracto-ui
```

For isolated UI development from this directory:

```powershell
npm run dev
```

Open `http://127.0.0.1:3006/` after Vite reports that it is ready. The Vite server binds to all interfaces (`host: true`), so do not expose it to an untrusted network. Stop the process with Ctrl+C.

## Application areas

The top-level router provides these browser routes:

- `/admin`: service status, versions, logs, and administrative settings.
- `/data`: database overview, backups, logs, and data settings.
- `/assets`: image rendering, gallery, lore, video, and asset tools.
- `/tiles`: tile status, inspection, generation, coverage, and logs.
- `/study`: minibrots, points, meridians, fields, circuitry, and other fractal studies.
- `/`: minimal Fracto landing page.

`src/App.jsx` initializes application text and settings, builds the navigation menu, and registers these routes. `src/main.jsx` mounts the application using `BrowserRouter`.

## Source organization

- `src/pages/`: top-level areas and their feature components.
- `src/navigator/`: interactive fractal navigation and viewport controls.
- `src/backend/`: browser-side clients for the data, asset, and tile services.
- `src/settings/`: setting definitions and defaults for application areas.
- `src/text/`: labels and other application text keyed by feature.
- `src/utils/render/`: fractal raster, coverage, color, orbital, and chart rendering.
- `src/utils/ui/`: reusable controls, layouts, dialogs, tables, and styling helpers.
- `src/chart/`: Chart.js integrations.
- `src/forms/`: configuration-oriented form definitions.
- `public/`: files copied directly into the Vite build.

The codebase uses a mix of class components and functional components. Styling is primarily implemented with `styled-components`, Emotion, and Material UI.

## Backend communication

Most backend clients derive a service URL by replacing port 3006 in `window.origin` with the target service port. Some components instead use hardcoded `localhost` URLs, while raster rendering derives the hostname from `window.location.host`.

As a result:

- all services normally need to run on the same machine or hostname as the UI;
- accessing the UI remotely may not work for features that call `localhost`;
- serving the UI on a port other than 3006 can prevent origin replacement from selecting the correct backend;
- backend CORS settings must permit the UI origin;
- there is no Vite development proxy or centralized runtime API-origin setting.

`src/backend/TilesBackend.jsx` also imports the root `config/network.json` and can upload generated point data to the configured `fracto-prod` endpoint. That operation changes remote state and should only be used with the intended environment configuration.

## Browser state

`src/AppSettings.jsx` initializes settings from feature definitions and stores settings marked `persist` in browser `localStorage`. This includes the selected page and other user preferences.

If stale settings cause unexpected behavior, clear local storage for the port 3006 origin in the browser developer tools and reload the page. Object and array settings larger than 1,000 serialized characters are intentionally not persisted.

## Production build

Create the static bundle from this directory:

```powershell
npm run build
```

Output is written to `dist/`, which is ignored by Git. Preview the generated bundle locally with:

```powershell
npm run preview
```

The current repository defines build and preview commands but does not include a production hosting or deployment configuration. Because it uses `BrowserRouter`, a production web server must return `index.html` for application routes such as `/tiles` and `/study`.

## Validation

Run the UI-specific checks from this directory:

```powershell
npm run lint
npm run build
```

Run the shared baseline from the root repository:

```powershell
npm run check
npm run start:check
```

For a manual smoke test, start the full system and verify that `http://127.0.0.1:3006/` loads, navigation changes routes, and the relevant backend-driven pages return data.

There is currently no UI test command or automated browser test suite. A successful production build catches module-resolution and bundling failures but does not validate backend availability or interactive behavior.

## Troubleshooting

- **Vite exits during supervised startup:** run `npm run build` in this repository to expose import or syntax errors, then inspect the root UI log.
- **Port 3006 is already in use:** stop the existing UI process before running the supervisor or isolated development server.
- **A page loads but has no data:** verify the corresponding backend health endpoint and inspect the browser console and network panel.
- **Remote browser access partially fails:** look for requests targeting `localhost`; several components do not yet derive every service URL from the UI hostname.
- **Shared import cannot be resolved:** restore this repository to `fracto/servers/fracto-ui/` and verify root configuration files exist.
- **Tile views report cache errors:** run `npm run tiles:index` from the root and restart the tile service.
- **Unexpected saved UI state:** clear local storage for the UI origin and reload.
- **Startup update is blocked:** commit, stash, or revert tracked changes in this repository.

When supervised by the root process, Vite output is appended to `logs/fracto-ui-log-YYYY-MM-DD.txt` in the root repository.
