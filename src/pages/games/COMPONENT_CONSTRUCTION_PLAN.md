# Agent-assisted component construction

Accepted design, 2026-11-23. Components are authored macro-scale assemblies of
cataloged materials. The first example is a wooded path: dirt floor, grass edges,
shrub clusters and trees. The construction stage is the entry point for Fracto's
in-house agent. The server planner now uses configured local inference;
stage conversation/preview/apply and explicit browser-local construction memory
are implemented. Account-linked memory remains outside this design.

## Practical interaction

The user supplies a construction brief. A construction planner extracts scale,
materials, layout and constraints; searches actual catalog entries; and proposes
a bounded scene-edit batch referencing real asset IDs and revisions. Missing
materials produce explicit gaps. Deterministic application tools validate and
apply the batch to a preview. Subsequent instructions and manual edits refine it.
Each batch is one undoable operation. Scatter tools use stored seeds, regions
and exclusion regions, rather than model-generated coordinates for every blade.
Current instructions take precedence over recipes and remembered preferences.

## Ownership and foundations

- UI: stage rendering, manual editing, conversation, preview/apply, local history.
- SDK: pure versioned component contract, bounds and reusable history operations.
- Data service: persistent documents, revision checks and migrations.
- Asset service: searchable material catalog/resources and eventual publication
  of assembled runtime assets. Authored documents are separate from registered
  published component assets; saving a draft does not publish it.
- AI service: planning, bounded tool orchestration and retrieval of applicable
  recipes/preferences. No direct SQL, arbitrary shell or filesystem execution.

Existing AI foundations include local Ollama generation, schema-validated JSON,
knowledge storage and versioned evaluated skill releases. Existing chat is an
administrator workflow. Construction needs its own authenticated bridge and
allowlisted operations; no browser receives an AI machine token. Existing
adapter limits require compact context and small planning steps. Stage integration
is implemented; automatic creative learning remains future work. Material search is
available through the asset API, stage browser and server planner.

## Sequence and acceptance

1. **Component document and editor persistence (implemented foundation).** Define
   meters, right-handed Y-up coordinates, pinned asset references, optional floor,
   placements, groups and seeded scatter rules. Provide save/load, conflict
   detection and undo/redo. Acceptance: new/name/save, refresh/open, edit/undo/redo,
   save again; malformed documents and stale saves cannot overwrite stored work.
   The stage now renders authored floors, objects and scatter rules through the
   step 3 tools; the complete document roundtrips through save/load and history.
2. **Material search (implemented).** Bounded asset-service queries search names,
   tags, categories and curated descriptions, with category/placement filters.
   Results pin actual IDs/revisions and report missing dimensions, unit conversion,
   axes, ground anchor, footprint and tile size. Metadata is manually curated in
   the materials catalog or stage browser; unknown values remain explicit.
   Geometry extraction, semantic search and material placement remain future work.
3. **Reliable construction tools (implemented).** Floor creation/texturing, place,
   transform, remove and seeded scatter with footprint exclusions share strict
   SDK commands. Each batch is one undo step. Source units/axes/anchor are applied
   without normalization; current catalog revisions are required. The frozen
   footprint-xz-v1 algorithm regenerates saved rules. See COMPONENT_TOOLS.md.
4. **Construction planner (implemented).** The machine-only AI endpoint accepts
   a brief and complete validated document, builds compact scene/catalog context,
   retrieves actual pinned materials and applies reviewed recipe guidance. Two
   schema-constrained local model calls return at most eight proposed commands.
   Server alias translation, pin rechecks and SDK replay independently validate
   references, counts and spatial bounds. Proposals include base/preview hashes,
   assumptions and explicit material/calibration gaps. Nothing is saved/applied;
   no generated code runs. See the AI service construction/README.md for API,
   limits, tests and local CLI. Registry skills remain read-only and unchanged.
   The initial real-model plain-floor smoke timed out at the existing planner
   deadline. NVMe model storage and integrated-GPU discovery now restore live
   plain-floor planning in 9.1–9.3 seconds after GPU initialization (17.3 seconds
   on the first GPU run). See AI construction/LATENCY.md for evidence and limits.
5. **Stage conversation (implemented).** Session conversation supports directions,
   clarifications, progress, cancellation, catalog alternatives and material gaps.
   Separate preview/draft rendering leaves history untouched until Apply. Material
   rechecks and canonical hashes protect against stale edits; the reducer validates
   again at commit. Apply is one undoable edit and normal Save persists it. The
   dedicated trusted-origin, enabled-session AI browser route keeps machine tokens
   out of the UI. See COMPONENT_CONVERSATION.md. Synthetic lifecycle tests pass;
   live plain-floor latency is now measured separately. Windows visual verification was stopped
   by Computer Use because it could not determine the current browser URL.
6. **Explicit memory (implemented).** “remember this” and last-applied recipes
   open review forms before saving browser-local construction instructions.
   Users inspect/edit/delete, enable/disable and scope patterns by keywords.
   Versioned AppSettings persistence is separate from component documents/history.
   Before planning, matching rules project to bounded kind/instructions guidance;
   local IDs, titles, complete libraries and profile fields stay in the browser.
   Current directions override guidance. Memory changes invalidate pending plans.
   Recipes re-search current materials rather than replay old commands. See
   COMPONENT_MEMORY.md. Automatic inference, supporting-example archives and
   fine-tuning remain future work. Identity-linked or cross-device memory needs
   a separate ownership/data-flow design; the API personal-data restriction is
   not waived by this implementation.
7. **Evaluation (executed; live plain-floor gate passes).** Eight reviewed fixture
   cases exercise plain floor, wooded path, crossing-path meadow, garden placement,
   refinement and remembered/current-direction comparisons. Seven positive scenes
   pass; an inadequate negative control is detected. Full footprint clearance,
   counts, scale, deterministic regeneration, undo/redo, renderer geometry and
   real MySQL temporary-table roundtrips pass. Six fault cases and UI tests retain
   populated drafts on engine/catalog failures. Following the initial 170,029 ms
   timeout, final live plain-floor reruns pass in 9,125 and 9,316 ms, following a
   17,293 ms first GPU run. Follow-up calibrated all ten vegetation materials and
   `dry_dirt`, verified actual stage geometry and original source hashes. The
   reviewed wooded-path recipe now passes 40/6/4 counts and full-footprint
   corridor/floor clearance in 23.9 s. Other build types and actual correction
   savings remain open. See the AI service
   construction/EVALUATION.md for evidence and reruns.

## Document v1 and history

`@fracto/sdk/FractoComponentDocument.js` is the shared contract. Documents contain
schema_version, UUID v4 id, name, units=m, coordinates=right-handed-y-up,
floor (null or asset/size/texture_repeat), objects, groups and scatters.
Asset references contain catalog id and revision; filenames, attribution,
identities and arbitrary metadata are excluded. Coordinates are meters and
Euler XYZ rotations are radians. Floors lie centered on the XZ plane at Y=0;
size is [width, depth], texture_repeat is [u, v]. Object position is [x,y,z],
rotation [x,y,z] and scale [x,y,z]. Groups are named organizational membership,
not transform hierarchies. Scatter bounds and exclusions are
[min_x,min_z,max_x,max_z], scale is [min,max], seed is uint32. The optional
algorithm field defaults to frozen footprint-xz-v1 for older documents and is
explicit in new rules. Floor.asset may be null for a neutral floor; the optional
texture_file pins an explicit registered color image for textured floors.
Persistence validates reference structure; construction tools/rendering resolve
exact current catalog revisions and calibrated metadata before use.

The data service stores the full validated document with an independent,
monotonically increasing revision. Saving is atomic and requires the expected
revision; revision 0 creates only. List and reopen use the same service. Documents
are installation-shared, with the existing enabled-session policy when configured;
there is no per-account ownership or preference profile in this milestone.

Undo/redo is bounded to 100 snapshot edits, independent of persistence revisions.
Save retains history; load starts a fresh history. Undoing back to the saved
snapshot clears the dirty indicator. Editing after undo clears redo. Editor
guides, camera and graphics retry are outside document history. Save errors and
conflicts retain the local draft. New/open/reload require inline discard when
dirty; back retains the current draft. Browser close/refresh warns while dirty.
Unsaved changes remain session-local; saved documents survive navigation/restarts.
There is no automatic draft recovery or publication in this milestone.

Run `npm run test:components` from the root for the contract, history, editor,
proxy and service tests. Set `FRACTO_TEST_COMPONENT_DATABASE=1` to include the
real MySQL temporary-table test after applying migration 024.

## Next implementation target

Material search, manual tools, server planning and stage conversation with
preview/apply and explicit memory are implemented and representative evaluation
has run. The plain-floor latency gate now passes in 9.1–9.3 seconds after GPU
initialization, with first-run costs documented. Vegetation and `dry_dirt`
calibration are complete. Reviewed wooded-path composition now passes the live
case. Continue with other material-build cases and actual visual review.
Repeated visual/user-correction evaluation is required before claiming creative
model quality or measured preference benefit.
