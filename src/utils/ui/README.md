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

## Markdown rendering

`MarkdownDocument.jsx` is the application-wide Markdown entry point. It owns
react-markdown, GitHub-flavored Markdown parsing and the element mapping to
`styles/MarkdownStyles.jsx`, originally designed for admin/reference. New consumers
use this component rather than importing the parser or copying the mapping.
Headings, paragraphs, lists, links, quotations, code and tables share presentation.

Pass Markdown source as children. Ordinary div props such as `style`, `className`
and event handlers apply to the document wrapper. `document_component` can be a
styled extension of `MarkdownStyles.Document` for scrolling or feature layout;
it should not override Markdown typography. `components` merges narrow custom
renderers (for example server timestamps or social document links) with defaults.
`external_links` opens ordinary links separately with noopener/noreferrer. Safe URL
handling remains the parser default. Raw HTML is skipped unless `allow_html` is
explicitly enabled for trusted application documents; the social workspace uses
this existing capability for its media markup. Do not enable it for database notes.

MarkdownDocument accepts additional `remark_plugins` for caller-specific parsed-document decorations without changing the Markdown source.
