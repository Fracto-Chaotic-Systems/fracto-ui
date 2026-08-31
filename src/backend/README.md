# UI backend clients

The modules in this directory are thin browser-side clients for Fracto's backend services. They keep request construction and service-specific payload handling out of page components; they do not start servers, provide a proxy, or define a shared API client.

All modules use named exports and a default class export. Import them with the `.jsx` extension:

```js
import DataBackend from '../backend/DataBackend.jsx'

DataBackend.get_orbitals({x: -0.75, y: 0.1}, 200, (data) => {
   // update component state with the service response
})
```

## Clients

### `DataBackend.jsx`

Calls the data service (normally port 3002) for minibrot listings, orbital data, lore listings/content, Farey sequences, backups, and query-table records. Most query methods use callbacks and defer the request by 250 ms. `get_farey_sequence()` is asynchronous and caches its filtered result in `DataBackend.FAREY_SEQUENCE`; it keeps positive terms with denominators up to 128. `lore_storage()` sends a JSON `PUT` and does not return the saved record.

### `AssetsBackend.jsx`

Calls the asset service (normally port 3003) to render an image, and the data service to add images to the gallery or load assets and lore content. Successful list methods return the service's `result` field; failures are generally logged and represented by an empty array or returned error value.

### `TilesBackend.jsx`

Calls the tile service (normally port 3004) for heat-map/canvas buffers, cache status, and tile coverage. `upload_points()` posts generated tile points to the configured `fracto-prod` endpoint from the root `config/network.json`; this is a remote write and should only be used with the intended environment.

### `MinibrotBackend.jsx`

Publishes minibrot/bailiwick records to the data service (normally port 3002). It exports `get_ideal_level()` and status constants (`BIN_VERB_*`) used by study components. `save_bailiwick()` converts the points and display settings into the service payload, then reports completion through its optional callback.

### `ServerBackend.jsx`, `AdminBackend.jsx`, and `LogsBackend.jsx`

Contain requests for the main server health/readiness endpoints, admin-service
version information, and log endpoints respectively. `BackendUtils.jsx` provides
the shared JSON request and query-string helpers used by these clients.

## Service origins

The clients derive service origins from the browser's current host and the configured service port from the root `constants.js`, using `utils/service_origin.jsx`. This keeps requests on the same machine when the UI is opened remotely, including the development port range.

This means that:

- backend services must be reachable from the browser using the same hostname as the UI for origin replacement to work;
- the configured production URL is still used only for the remote tile upload workflow; and
- backend CORS rules must allow the UI origin.

The clients assume browser globals (`window`, `fetch`, and in `TilesBackend` the bundled `axios` dependency). Do not import them from Node-only scripts.

## Request conventions

Most requests pass coordinates as `x`/`y` in UI objects and translate them to `re`/`im` query parameters where the service expects complex-plane values. Query parameters are assembled directly by the current implementation, so callers should pass already-normalized primitive values and avoid assuming automatic URL encoding.

Error handling is intentionally lightweight and differs by method: some methods catch errors and return an error or empty array, while callback-based methods allow fetch errors to reject or surface through their callback payload. Page components should show loading/error state appropriate to the operation rather than relying on one universal response shape.

## Adding a client method

Keep service URLs and payload formatting in the relevant client. Reuse `FETCH_JSON_HEADERS` from `pages/study/StudyUtils.jsx` for JSON reads where the surrounding client already uses it. Preserve the method's existing callback-versus-Promise style, document any new remote write, and update the consuming page only with the normalized data it needs.

When changing an endpoint, verify the corresponding backend route and test with the service running. From `servers/fracto-ui/`, run:

```powershell
npm run lint
npm run build
```
