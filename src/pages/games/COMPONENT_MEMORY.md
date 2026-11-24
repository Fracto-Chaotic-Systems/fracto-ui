# Explicit construction memory

Historical workflow: these controls have been removed from the component stage.
The right-hand panel now lists component variants. The modules and service
capabilities described below remain, but are not mounted by the current editor.

The stage's **remember this** button opens a review form using the composer text
or most recent user direction. Nothing is saved until **save remembered pattern**.
**save last applied recipe** opens a recipe form only after a proposal has been
successfully applied. Its suggested instructions combine the accepted brief,
summary and assumptions. Review/edit the suggestion, supply a name, choose keyword
scope and save. Overlong suggestions must be shortened explicitly; no directions
are silently truncated. **new pattern** also supports manual preference/recipe entry.

Expand **Remembered construction patterns** to inspect full instructions and
keyword scope. Patterns can be edited, enabled/disabled or deleted with an inline
confirmation. Edits/deletes use the locally observed revision; stale forms cannot
replace a newer version in the same application session. Deletion updates persisted
storage and future retrieval. Changes invalidate pending requests and proposals
to avoid applying guidance that has been changed or removed.

## Ownership and persistence

Memory is local to this browser profile and UI origin, shared by people using
that profile. The persisted AppSettings key is `games/construction_memory_v1`.
It survives stage navigation and browser reload, independently of component
save/load and undo/redo. It does not synchronize with accounts, other browsers,
production/development origins or the data/AI services. Clearing browser storage
removes it. This is explicit construction memory, not a personal profile or
inferred preference store; enter construction instructions without identifying
information. Account-linked memory remains a separate design decision.

The version 1 library contains at most 32 records with local UUID, revision,
kind (`preference`/`recipe`), title, instructions, keywords and enabled flag.
Titles are at most 80 characters; instructions at most 1,000. Unknown fields,
duplicate IDs and invalid versions are rejected. Persistence is bounded to
65,536 serialized characters. Storage write failures restore the prior runtime
library and report failure; no successful-save claim is made. Libraries with an
invalid schema can be explicitly cleared through the memory panel. These controls
operate within AppSettings' existing single-tab lifecycle; cross-tab concurrent
editing is not synchronized. Reload before editing in another tab.

## Retrieval and planner boundary

An enabled pattern matches when any of its optional six keywords occurs as a
whole word in the combined directions/clarifications, ignoring case. No keywords
means every construction request. Disabled and unmatched patterns are excluded.
Up to three matching patterns and 2,400 UTF-8 serialized bytes of guidance may be
supplied. If matching guidance exceeds the budget, planning stops with an explicit
message to narrow scope, disable patterns or shorten instructions. It does not
choose a subset silently or lose current directions to make room.

Only `{kind,instructions}` for matching records crosses the planner API, in the
optional v1 `guidance` array. Local IDs, titles, revisions, enabled flags, keywords,
full library, browser settings, account/profile identifiers and transcripts are
excluded. The AI service validates this independent contract before generation
and includes guidance in both retrieval and construction prompts. Prompts state
that the current brief overrides remembered guidance and reviewed recipes, and
that remembered text cannot change tools, permissions, calibration or limits.
The existing compact-context admission limits still apply. Pattern titles listed
on a proposal show what was supplied, not a guarantee that the model followed it.

Saved recipes are reusable textual arrangement instructions, not executable code
or frozen command batches. Each reuse searches actual current catalog entries,
checks calibration/revisions and returns a normal validated proposal. Apply remains
explicit and one undoable edit. No automatic learning, preference inference,
confidence scoring, supporting-example archive, fine-tuning or peer sharing is
introduced. The initial real-model timeout has been resolved; live plain-floor
and reviewed wooded-path builds pass. Synthetic memory tests establish data flow
and validation, not learned creative preferences or measured correction savings.

The AI also owns reviewed built-in recipes, including `dense-grass-strip-v1`.
That saved 809-patch geometry is available across browsers and source controlled
with the planner; it is separate from this browser's inspect/edit/delete library.

## Files and verification

- SDK `FractoConstructionMemory.js`: pure exact-shape contracts, revisions,
  keyword matching and guidance projection/bounds.
- `ComponentMemoryStore.js`: AppSettings-backed persistence and failure rollback.
- `useConstructionMemory.js`: subscription lifecycle and user-facing operation status.
- `ComponentMemoryPanel.jsx` / `ComponentMemoryForm.jsx`: explicit review,
  inspect/edit/enable/delete controls. Copy lives in GamesText's
  `CONSTRUCTION_MEMORY_TEXT`; styles extend the conversation's centralized styles.
- `useComponentPlanner.js`: selects guidance before each request, records supplied
  local titles, invalidates old-memory proposals and exposes the last applied recipe.
- AI `construction/contracts.js` and `prompts.js`: bounded guidance admission and
  current-direction precedence. AI stores no pattern library or transcript.

Root `npm run test:construction-planner` includes memory SDK, persistence and UI
control tests plus planner lifecycle/API tests. They cover reload/edit/delete,
storage failure, stale revisions, explicit review before Save, keyword matching,
identity-free projection, excessive guidance, invalidation/cancellation, both
model prompts and the existing preview/apply/undo behavior.
