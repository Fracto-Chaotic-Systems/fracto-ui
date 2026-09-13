# Video Data Design

The video system is intentionally designed to evolve without invalidating
projects that have already been saved. A row in the `videos` table contains
ordinary identifying and audit fields, plus two JSON documents:

- `meta` contains technical configuration such as image dimensions, frame
  rate, duration, and output settings.
- `script` contains the ordered motion path: focal points, scope changes,
  interpolation choices, and any frame-specific directives.

These documents have different responsibilities and may change shape at
different rates. Rendering code must therefore treat both as versioned input,
not as an unstructured collection of properties.

## Compatibility rules

Every record must include an explicit format version. Use separate
`meta_version` and `script_version` values when the two documents can evolve
independently; otherwise a single `schema_version` may identify the complete
record. Version values should be monotonically increasing and should change
only when the interpretation or required structure changes.

Consumers should normalize data at their boundary before using it. A
normalizer should:

1. Accept missing documents and fields.
2. Apply documented defaults for fields introduced after the record was saved.
3. Convert known older versions into the current in-memory representation.
4. Preserve unknown fields whenever possible so newer data is not lost when an
   older client edits a project.
5. Return the normalized version and any compatibility warnings to the caller.

Do not scatter fallback values throughout React components or render workers.
Keep defaults and version migrations in a shared data-model utility so every
consumer interprets a project consistently.

## Migration policy

Migrations should be deterministic, idempotent, and independently testable.
They should transform one known version into the next, rather than trying to
understand every historical version in one function. A migration should not
silently discard data or change the meaning of an existing field.

Prefer in-memory migration when a project is loaded. Persist the upgraded JSON
only when the user explicitly saves the project, or when a deliberate batch
migration is run. This keeps merely viewing an old project non-destructive and
allows rollback from a backup if a migration later proves incorrect.

When adding a field:

- Define its default value and units.
- Document whether it applies to `meta`, `script`, or both.
- Update the version and migration path.
- Make old records render with the default before they are saved.
- Add tests for missing, old, current, and partially populated documents.

When removing or renaming a field, retain a migration path and consider an
alias during the compatibility window. Unknown future fields should be
round-tripped where safe, even if the current UI cannot edit them.

## Script-specific guidance

The script is an ordered timeline. New motion settings should be introduced as
optional fields with stable defaults, rather than changing the meaning of an
existing field. Frame-specific extensions should be additive and should not
require older consumers to understand every directive in order to render the
parts they do support.

Technical settings belong in `meta`, not in individual script points. A script
should remain portable between output configurations unless a setting is
intrinsically part of the motion itself.

## Validation and observability

Validate normalized data before rendering or exporting. Report the record
version, the normalized version, and any unsupported capabilities in diagnostic
messages. A project with an unsupported future version should produce a clear
compatibility error rather than being interpreted as the newest known shape.

Keep fixtures for each supported version and test round-trip behavior so that
loading and saving a project does not unexpectedly reorder points, alter
numeric precision, or remove extension fields.
