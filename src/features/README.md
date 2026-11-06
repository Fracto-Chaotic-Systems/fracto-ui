# Structured application feature catalog

`catalog.json` is reviewed application reference data for future AI knowledge
seeding. It covers the home entry page and every current sidebar destination:
seven areas and 53 destinations. It contains no user records, settings values,
credentials, conversations, runtime observations or deployment-specific URLs.
The UI does not load this catalog at runtime. Navigation still belongs to
`App.jsx` and the area's `SIDEBAR_LIST` registrations.

`catalog_contract.js` validates the version 1 structure and relationships without
reading files. `knowledge_documents.js` is the reviewed pure area-document
extractor. The AI service's `subject_providers/ui.json` declares its source and
seven outputs. UI npm builds now generate a deterministic bundle under the AI
checkout's ignored `generated/knowledge/` directory. The AI knowledge CLI now
supports explicit reconciliation and publication as complete persisted snapshots;
see the AI checkout's `subject_providers/SNAPSHOTS.md`. A read-only app-reference
skill bootstraps in the AI registry, reads explicitly published snapshots and now
answers questions in the chat page's App reference mode. The AI runtime now seeds
prepared bundles on startup and refreshes every minute under operator-ownership
guards; see `subject_providers/REFRESH.md` in the AI checkout.

## Fields and ownership

- `catalog_id` identifies the Fracto UI; `catalog_version` versions reviewed
  content independently of the subject-provider contract and extractor release.
- `areas` record route, component, visible menu label, and browser selection key.
  The internal `assets` area is visibly labeled **artifacts**.
- `features` record stable IDs, area/section, component, sidebar label, page-title
  binding, purpose, supported inputs, access profile, configuration references,
  limitations, related features, and owning source files. IDs follow existing
  section identifiers with underscores replaced by hyphens; home has no section.
- `label` and `title` preserve their AppText key, current text and source module.
  They are deliberately separate: chat opens **fracto AI**, full map opens
  **logistic map**, and freeform opens **freeform bailiwicks**. A null title means
  no static `SectionTitle` binding was found, not an invented page heading.
- `availability` is `implemented`, `placeholder`, or `empty`. Placeholder panels
  may display titles, legacy forms or static content without the implied complete
  workflow. Empty entries currently render no right-pane component. These fields
  are documentation, not a live availability or permission check.
- `settings` list registered AppSettings keys imported directly by the feature
  panel. Nested components can have additional preferences; this initial catalog
  does not claim to inventory every nested control or setting.
- `environment` records configuration variable names and their defining source
  locations only, never configured values. Access profiles explain conditional
  authentication and lab exceptions; the actual server remains authoritative.
- `sources` are logical repository/path references for maintainers and later
  provenance generation. Source ownership does not certify content accuracy.

Permissions are described rather than granted. For example, opening admin
navigation does not grant administrator API access, the read-only lab bypass
does not enable chat, and chat has its own explicit lab setting. Client-only
settings and placeholder pages are not mislabeled as protected admin operations.

## Drift checks

Run from the UI checkout:

```powershell
npm run check:catalog
npm run test:catalog
```

`scripts/catalog_source_facts.js` parses JSX with the declared development-only
Babel parser. It resolves literal constants, template strings and AppText
bindings from source syntax; `scripts/catalog_navigation.js` assembles route and
sidebar facts from that reader. It never imports/executes application modules or
constructs React components. Dynamic/unrecognized registries fail the check
rather than being evaluated or silently omitted.

`scripts/check_feature_catalog.js` checks exact route/sidebar coverage and order,
labels, titles, component mappings, area-selection settings and direct panel
setting references. It verifies cited files remain inside the appropriate
checkout and environment names occur in their cited source. These checks run
automatically through `prebuild` when using `npm run build`; direct `vite build`
does not run npm lifecycle hooks. The test suite also checks the inactive subject
provider against the catalog areas and source-size declaration.

Vite development startup and relevant source/catalog changes also rebuild the
bundle automatically through `scripts/knowledge_bundle_plugin.js`. Builds are
debounced, serialized and run in fresh child processes. Invalid changes retain
the previous prepared artifact until the reviewed catalog/source checks pass.

Checks run against the ordinary full Fracto checkout, including sibling services
used as documentation evidence. Text descriptions, permission semantics, feature
completeness and nested controls still require human review when their owning
implementation changes. A passing check is not live verification, a secret/PII
detector, or proof that every descriptive sentence remains correct.

## Updating the catalog

When adding/removing a route or sidebar panel, update its area/feature entry and
review its purpose, inputs, access, configuration, limitations and relationships.
Use actual visible AppText labels rather than deriving names from filenames.
Check the component before calling a destination implemented. Update
`catalog_version`, run the checks, and revise the provider's declared area set if
an area is added or removed. Stable-ID renames require a later knowledge migration.
Do not copy rendered logs, accounts, local configuration, uploads or transcripts.
