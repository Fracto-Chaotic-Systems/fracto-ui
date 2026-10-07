# UI text and translation

The modules in this directory define the user-facing text for the major UI
areas. Each exports stable text-key constants and an `APP_*_TEXT` map from
those keys to the current English strings. Components use the constants rather
than embedding the strings, which keeps wording centralized and gives future
translations consistent identifiers.

## Files

- `AdminText.jsx` contains admin navigation labels, Reference and Social page
  messages, commit and status labels, and admin logs text.
- `AssetsText.jsx` contains labels and help text for the Assets area, including
  image and video generation, gallery, lore, detector, simulator, and seed
  surveys pages.
- `DataText.jsx` contains Data navigation, query and database labels, and
  MySQL/AWS settings and status text.
- `NavigatorText.jsx` contains canvas navigator labels, rendering-strategy
  descriptions, coverage messages, and related help text.
- `RootText.jsx` contains shared navigation, menus, forms, and log viewer text
  such as the Study sidebar's bailiwicks and bifurcations dividers, search,
  timestamps, relative-time labels, and empty/error messages.
- `StudyText.jsx` contains Study section names (including the `full map`
  sidebar label), scientific controls and labels,
  and messages for magnitudes, orbitals, meridians, circuitry, detection,
  minibrots, nodes, and related views.
- `TilesText.jsx` contains Tiles navigation and text for tile generation,
  automation, benchmark/test controls, progress, and results.
- `WelcomeText.jsx` contains the welcome title and its sign-in, access-state,
  and other welcome-page messages.

## How text is declared and used

Each module gives keys a namespaced string value, usually built from a domain
prefix such as `study` or `admin`, followed by a descriptive name. For example:

```jsx
export const KEY_ADMIN_REFERENCE_LOADING = "admin/reference_loading";

export const APP_ADMIN_TEXT = {
  [KEY_ADMIN_REFERENCE_LOADING]: "loading reference documents...",
};
```

The actual modules build these key strings from constants to reduce typos.
Components import the relevant key and request its current string with
`AppText.get(KEY_ADMIN_REFERENCE_LOADING)`. Keys are independent of the
displayed wording; changing a translation should not require changing the key
or all of its callers.

At startup, `App.jsx` merges the `APP_*_TEXT` maps and passes the result to
`AppText.initialize`. `AppText` stores that map and returns the value for a key
through `get`. Today the merged map contains one English set of strings: there
is no locale selection, fallback chain, pluralization, or parameter-formatting
system yet. A missing key currently returns `undefined`, so new entries should
be added to the relevant map before their keys are used.

## Keeping the text ready for translation

- Put new visible words, button labels, accessibility labels, status messages,
  and help text in the text module for their UI area. Use `AppText.get` in the
  component instead of writing the English sentence directly in JSX.
- Keep keys stable, descriptive, and locale-independent. Use the key to name
  the meaning or context, not to duplicate the English sentence.
- Give text with different meaning or context different keys, even when the
  current English wording happens to match. This lets translations vary
  naturally by context.
- Keep complete phrases together where possible. Avoid building sentences by
  concatenating translated fragments; word order can differ between
  languages. If a string needs variable values or plural forms, record that
  need explicitly so a future message-formatting layer can handle it.
- When adding a locale system, provide equivalent maps keyed by these same
  identifiers, select the active map before `AppText.initialize`, and define a
  deliberate missing-key fallback. Locale-specific variants should live in
  separate translation resources rather than changing component logic.

`AppText` is currently a simple lookup layer, not a complete internationalized
text engine. The key-and-map structure prepares the UI for translated catalogs
while leaving locale negotiation and advanced language rules for a later
implementation. It also does not guarantee that every visible string has
already been extracted; move hardcoded UI copy into the appropriate map when
editing or translating those components.
