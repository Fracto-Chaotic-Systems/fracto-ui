# Video Record Schema

This document is the evolving reference for the `videos` table and the JSON
documents stored in its `meta` and `script` fields. It intentionally starts as
scaffolding; each capability should extend the relevant section together with
its version migration and fixtures.

## Database record

| Field | Type | Description |
| --- | --- | --- |
| `id` | integer | Stable video-project identifier. |
| `title` | string | User-visible project title. |
| `created_at` | timestamp | Record creation time. |
| `updated_at` | timestamp | Most recent persisted update. |
| `archived` | boolean | Soft-delete marker; `false` by default. |
| `meta` | JSON object | Technical rendering and output configuration. |
| `script` | JSON object | Ordered motion and frame instructions. |
| `meta_version` | integer | Version of the `meta` document, when independently versioned. |
| `script_version` | integer | Version of the `script` document, when independently versioned. |

The existing `assets` table is also checked during asset-server startup. Its
schema is owned by the asset server and is initialized through the data server
in the same idempotent manner.

If the implementation uses one record-wide version instead, document that
choice here as `schema_version` and remove the unused version columns from the
database design.

## `meta`

Current version: **not yet defined**

The `meta` object will contain technical settings such as:

```json
{}
```

Fields, units, defaults, and supported values should be added here when the
first video configuration is implemented.

## `script`

Current version: **not yet defined**

The `script` object will contain the ordered path and frame-specific motion
instructions, such as focal points, scope changes, interpolation settings, and
future directives.

```json
{}
```

The exact timeline representation remains intentionally open. New fields must
be optional until their defaults and migration behavior are documented.

## Version history

| Version | Document | Change | Migration notes |
| --- | --- | --- | --- |
| - | - | No persisted schema version has been established yet. | - |

## Schema maintenance

When adding or changing a field, update this document with its type, units,
default, valid range, and version. Add a fixture for the prior shape and a
test proving that older records normalize to the current in-memory shape.
