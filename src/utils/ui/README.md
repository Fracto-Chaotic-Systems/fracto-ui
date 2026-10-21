# Shared UI controls

This folder provides reusable `Cool*` controls and shared interaction helpers.
Feature components compose them; presentation primitives live under `styles/`.

`CoolTabs.jsx` renders a tab header and content card. Its optional `fill_height`
prop is for a parent with a bounded height and `display: flex; flex-direction:
column`. The header keeps its natural height; the bordered card fills remaining
space with a zero minimum height. Content must fit the card and own its scrolling.
The default remains natural document flow for existing callers.

`CoolEditLink.jsx` is the compact shared pencil edit action. It looks like an
icon link, uses the `pencil_icon` from `CoolIcons.jsx`, and retains native
button keyboard behavior plus the caller-provided tooltip/accessible label.
