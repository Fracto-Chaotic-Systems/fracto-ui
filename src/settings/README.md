# UI settings

Each module in this directory declares namespaced setting keys and an
`APP_*_SETTINGS` registry for one part of the UI. A definition supplies the
value type, default value, description, and whether the value should persist.
The components that use a setting read and update it through `AppSettings.jsx`.

## Files

- `AdminSettings.jsx` defines admin-page navigation and layout preferences,
  log timestamp visibility, commit-repository visibility, and the selected
  Social and Reference documents. Reference selection and expanded folders,
  plus the selected Servers tree item and server URL list, are included here.
  The address book is browser-local and stores only `{ urls: string[] }`;
  this server and saved servers' names and status are fetched live. A future URL-list
  import can merge normalized URL strings without storing import metadata.
  It raises the serialized persistence limit for this setting to accommodate
  a useful URL list.
- `AppSettingsPersistence.js` serializes persistent object and array values,
  writes and parses their browser-local values, and applies the setting's
  optional size limit or the default 1,000-character limit.
- `AssetsSettings.jsx` defines the Assets page section and splitter position,
  plus image generator, video, detector, simulator, gallery, and lore state
  such as frame parameters, resolutions, selected items, and panel positions.
- `DataSettings.jsx` defines the Data page section, splitters, log display,
  selected query tab, and data-service connection fields.
- `NavigatorSettings.jsx` defines the canvas navigator's rendering strategy,
  crosshair visibility, hover/client coordinates, and temporary disabled
  state. The pointer and disabled values are runtime-only; the strategy is
  persisted.
- `RootSettings.jsx` defines application-wide navigation state, including the
  selected app page and last visited route. It also defines server-root,
  viewport, and clipboard values, and provides `poll_viewport_dimensions` to
  keep viewport state current. Viewport and clipboard data are runtime-only.
- `StudySettings.jsx` defines the Study page section and its feature state for
  magnitudes, points, meridians, fields, circuitry, detection, minibrots,
  nodes, and hyperplane views. It includes numeric controls, frame settings,
  splitter positions, animation speed, and selected rows.
- `TilesSettings.jsx` defines the Tiles page section, logs and layout, test
  options, and tile-generator frame and splitter settings.

## How `AppSettings` coordinates configuration and UI state

`AppSettings.jsx` is the shared settings registry and runtime store. During
startup, `App.jsx` merges the `APP_*_SETTINGS` registries from these modules
and passes the result to `AppSettings.initialize`. Initialization sets each
default and loads saved values from the browser's `localStorage` for settings
whose definition has `persist: true`.

Components call `AppSettings.get(key)` to read values and
`AppSettings.on_settings_changed({ [key]: value })` to update them. Updates
are applied only for registered keys, booleans are coerced, object and array
values are copied, subscribers are notified, and values are saved when
persistence is enabled. Object and array settings have a default 1,000-character
serialized-value limit; a definition can set `max_persist_length` when its value
needs more room. Components that need to react immediately to a setting can
subscribe with `AppSettings.subscribe` and should unsubscribe when they are
done. The `TYPE_STRING`, `TYPE_NUMBER`,
`TYPE_OBJECT`, `TYPE_ARRAY`, and `TYPE_BOOLEAN` exports provide the supported
setting types.

Settings keys use slash-separated namespaces such as `study/circuitry` or
`admin/reference_document`. Keep each feature's definitions in its matching
module, add that registry to the merge in `App.jsx` if it is new, and use the
same key in consumers. Renaming a persisted key makes existing browser values
unavailable unless a migration is provided.

Persisted values are browser-local preferences and configuration, not a
server-side configuration source. `localStorage` is accessible to scripts
running in the page, so it is not a secure secret store; do not treat it as
appropriate for long-lived production credentials.
