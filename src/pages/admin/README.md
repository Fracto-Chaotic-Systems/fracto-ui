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
  “this server” in the tree. Saved servers are queried without browser credentials
  at `/healthz`, falling back to `/api/main/healthz` for nginx deployments. Each
  attempt has a four-second timeout; successful routes are remembered for later
  five-second refreshes. Overlapping refresh cycles are skipped.
  Their names and health remain live page state; only URLs are stored. The
  address book is local to the browser and is not shared with other servers.
- `AdminServersUtils.js` normalizes server base URLs, reads URL-only address
  books, merges valid unique addresses, clears draft state without changing
  saved history when entry is cancelled, and validates health contract version
  1 responses. It performs no network requests itself.
- `AdminServers.md` is the offline Markdown presentation template for the
  selected Fracto main server and its five dependent service health indicators.
  The React heading composition supplies editable title and role controls.
  The service checks describe dependencies of this main server, not additional
  Fracto main servers. `{{text.*}}` placeholders resolve through `AppText` for
  translatable labels and explanatory copy; `{{server.*}}` and `{{health.*}}`
  placeholders resolve to escaped runtime values before Markdown rendering.
  Tree entries are nested under a non-displayed root item because `CoolTree`
  renders the root item's children as rows; both the local server and saved
  remote addresses appear there.
- `AdminServersTemplate.js` substitutes escaped runtime values into the Markdown
  template. Valid HTTP(S) public addresses use explicit links with a normalized
  destination and an independently escaped label. This prevents GFM automatic
  link detection from including Markdown escape backslashes in IP addresses or
  URL paths. Stored address-book URLs and health requests remain unescaped.
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

## Server titles

The edit-title control beside the large server heading changes a browser-local
label for the selected server, including “this server”. Confirm with Enter or
the checkmark; Escape or the cancel button discards the edit. Saving an empty
title restores the live server-name/hostname fallback. Labels appear in both
the heading and tree and survive health refreshes and page reloads.
`AdminServerTitle.jsx` owns the transient editor; `AdminServerTitles.js` handles
label lookup and replacement. The persistent `admin/server_titles` object keys
remote labels by normalized URL and the local label by `this-server`. This is
separate from the URL-only address book; it does not rename the remote server
or alter connection URLs.

The shared text input preserves intentionally empty edits (using nullish rather
than truthy fallback), so clearing a title is possible without restoring the
previous text before confirmation. The heading renderer keeps a stable component
identity so the five-second health poll does not remount the active editor.

Server tree rows display a green check before the title for ready/healthy
responses and a red cross for unavailable, pending, or unhealthy responses,
including the local server. The former status-word suffix is removed. Tooltips
and accessible labels retain the detailed status, while a plain-text node label
preserves searching and sorting independently of the decorated title.

## Server roles

The role row beneath the large heading has its own edit control. Enter or the
checkmark saves; Escape or cancel discards; an empty role restores the localized
“Fracto main server” default. `AdminServerRole.jsx` owns the transient editor,
which stays mounted during polling and resets when selection changes. Roles
persist separately from titles in browser-local `admin/server_roles`, using
the same normalized URL / `this-server` keys. The role row is rendered by the
React heading composition rather than the Markdown template, so edits remain
plain text and cannot change Markdown structure. These labels do not change
remote server configuration or permissions.

## Relative timestamps

Started and health-checked values use live relative times through the existing
`react-time-ago` control. Hover shows the full date and time in the browser
locale/time zone. `AdminServerTimes.js` derives ISO values from the health check
time and reported uptime; missing/invalid values remain unavailable. The template
encodes valid dates as internal timestamp markers, and `AdminServerTime.jsx`
converts those markers to relative-time elements while preserving normal public
address links. No extra polling is needed for the relative text to update.

Title and role edit actions use the shared `CoolEditLink` pencil icon, with no
button background or border. Localized hover titles and accessible labels
identify each action; native button semantics preserve keyboard activation.

Uptime uses the largest applicable unit (seconds, minutes, hours, or days),
localized with `Intl.NumberFormat` and at most one decimal place. Missing or
invalid uptime remains unavailable instead of implying zero seconds.

## Client-session list

Each selected server has an `AdminServerClients` table below its details, loaded
only for that selection and refreshed every five seconds or manually. The main
server exposes `/clients`; nginx UI origins use `/api/main/clients`. The route
requires administrator access, except for the existing explicit auth-disabled
lab read-only bypass. Remote discovery is credential-free; protected remote
lists must be viewed on the remote server itself. Health availability does not
imply access to client information. Older remote installations must deploy the
new endpoint. No session cookies or bearer credentials are sent to saved URLs.

Rows show user, role, browser user agent, session creation, last authenticated
activity and expiry. Times use relative display with full hover dates. These
are unexpired login sessions, not online-presence or tab counts. Auth-disabled
anonymous browsers do not create rows. Logout, expiration or restart removes
sessions; no session tokens, emails or provider identities are returned.
