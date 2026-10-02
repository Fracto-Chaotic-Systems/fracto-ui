# Admin pages

This folder contains the page components and feature-specific helpers rendered
inside the admin section. `src/pages/Admin.jsx` owns sidebar navigation and
selects one of these components for the right pane. User-visible text is
registered in `src/text/AdminText.jsx`; persistent admin settings are defined
in `src/settings/AdminSettings.jsx`.

- `AdminOverview.jsx` renders the admin overview documentation browser shell.
  Its tree and Markdown lookup are intentionally empty until the documentation
  content source and data structure are defined.
- `AdminServers.jsx` renders the server-awareness documentation view, polls the
  main server health endpoint every five seconds, and substitutes runtime
  values, including its administrator-assigned `server_name`, into
  `AdminServers.md` and the “this server” tree entry. A 35px controls row below
  the unchanged page title can capture an absolute HTTP(S) URL using `CoolInputText`; confirmed
  URLs are normalized, de-duplicated, and saved in the browser-local
  `admin/server_address_book` setting as `{ urls: string[] }`. The list is
  restored when the page loads, and each saved address appears alongside
  “this server” in the tree. Saved servers are queried at `/healthz` without
  browser credentials, with a four-second timeout and five-second refresh.
  Their names and health remain live page state; only URLs are stored. The
  address book is local to the browser and is not shared with other servers.
- `AdminServersUtils.js` normalizes server base URLs, reads URL-only address
  books, merges valid unique addresses, clears draft state without changing
  saved history when entry is cancelled, and validates health contract version
  1 responses. It performs no network requests itself.
- `AdminServers.md` is the offline Markdown presentation template for the
  current Fracto main server and its five dependent service health indicators.
  The service checks describe dependencies of this main server, not additional
  Fracto main servers. `{{text.*}}` placeholders resolve through `AppText` for
  translatable labels and explanatory copy; `{{server.*}}` and `{{health.*}}`
  placeholders resolve to escaped runtime values before Markdown rendering.
  Its one visible tree entry is nested under a non-displayed root item because
  `CoolTree` renders the root item's children as rows.
- `AdminReference.jsx` presents the repository Markdown browser and manages
  its document selection and expanded-folder state.
- `AdminReferenceTree.js` builds the reference folder/document tree and
  restores a saved selection.
- `AdminCommits.jsx` displays repository commit history and revision details.
- `AdminCommitTimeline.js` provides commit timeline presentation helpers.
- `AdminSocial.jsx` presents social publishing documents and refresh status.
- `AdminSettings.jsx` displays and edits administrative configuration.
- `AdminStatus.jsx` displays service health, readiness, and build revision
  information.
- `AdminLogs.jsx` presents server log records and timestamp controls.
- `AdminQueries.jsx` displays administrative query and diagnostic results.
- `AdminAccounts.jsx` loads user records from the administrator-only
  `AdminBackend.users()` endpoint and displays every returned row and field in
  a scrollable table, with loading, empty, and error states. The current server
  endpoint caps a response at 1,000 users; filtering and column selection are
  not implemented.
