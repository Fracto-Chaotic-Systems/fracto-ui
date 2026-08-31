# Fracto UI source

This directory contains the React application for the Fracto user interface. For installation, startup, ports, production builds, and system-level troubleshooting, see the [service README](../README.md).

## Application flow

`main.jsx` mounts the application in `#root` and wraps it in React Router's `BrowserRouter`. `App.jsx` then:

1. combines the feature text dictionaries and initializes `AppText`;
2. combines the feature setting definitions and initializes `AppSettings`;
3. starts viewport-dimension polling;
4. creates the top navigation; and
5. registers the `/admin`, `/data`, `/assets`, `/tiles`, `/study`, and `/` routes.

The top-level feature components live in `pages/`. Most features divide their UI into overview, status, settings, logs, or specialized tool components in a matching lowercase subdirectory.

## Directory guide

- `backend/` contains browser-side interfaces to the Fracto data, asset, tile, and minibrot services.
- `chart/` contains shared Chart.js configuration and orbital-chart helpers.
- `forms/` contains reusable connection and operator form definitions.
- `navigator/` implements fractal viewport navigation, transit, coverage, legends, keyboard input, and split layouts.
- `pages/` contains routed application areas and feature-specific components.
- `settings/` declares setting keys, types, defaults, and persistence behavior by application area.
- `styles/` contains shared styled-component definitions for major layouts.
- `text/` contains keyed labels and display text grouped by application area.
- `utils/render/` contains fractal visualization, raster, chart, color, point, and coverage components.
- `utils/ui/` contains the reusable `Cool*` controls and their styles.
- `utils/` contains general browser and data helpers.

## Settings and text

Application settings are centralized through `AppSettings.jsx`. Add a setting definition to the appropriate file under `settings/`, merge new feature-level definition objects in `App.jsx`, and read or update values through `AppSettings`. Settings marked `persist` are stored in browser `localStorage`; object and array values are only persisted when their serialized form is under 1,000 characters.

Visible application copy is keyed through `AppText.jsx`. Add feature text to the corresponding file under `text/` and include any new top-level text dictionary in the initialization performed by `App.jsx`. Components should retrieve keyed text with `AppText.get(...)` instead of duplicating shared labels.

## Backend and shared-code boundaries

Code in `backend/` runs in the browser. Service URLs are derived by preserving the browser's current hostname and replacing only the port via `utils/service_origin.jsx`. This supports both production and development service port ranges when the UI is opened from another computer.

The UI also imports shared files from the root Fracto repository. Keep this service at `servers/fracto-ui/` so those relative imports continue to resolve. Changes to files outside this service belong to the root repository, while changes under this directory belong to the independent `fracto-ui` repository.

## Adding a feature

A typical feature change involves:

1. adding the page or component under the closest existing feature directory;
2. adding shared settings and text through their registries instead of component-local copies;
3. placing reusable presentation controls in `utils/ui/` and fractal-specific visualizations in `utils/render/`;
4. keeping service requests in `backend/` when they are shared by multiple components; and
5. registering a route in `App.jsx` only when the feature is a new top-level application area.

The codebase contains both class and functional React components. Follow the local pattern of the feature being changed and preserve the existing `.jsx` import extensions.

## Validation

Run UI checks from `servers/fracto-ui/`:

```powershell
npm run lint
npm run build
```

There is no automated UI test command. After changing routing, browser state, or a backend integration, also run the application and smoke-test the affected page with the required Fracto services available.
