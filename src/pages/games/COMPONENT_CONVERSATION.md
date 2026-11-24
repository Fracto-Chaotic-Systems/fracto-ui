# Stage construction conversation

The construction assistant appears at the top of the stage properties pane.
Enter directions in meters, request a proposal, review assumptions and questions,
then compare **preview proposal** and **show current draft**. Catalog matches
offer alternatives: **ask to use** puts a material request in the composer for
review before submission. Missing matches and calibration remain explicit.
Partial proposals can be applied while other requested materials remain unresolved.

The preview renders a separate document without changing dirty state, history or
the draft saved by the toolbar. An on-stage notice identifies preview mode.
Manual construction and naming are disabled while viewing a preview; return to
the draft to edit. Camera navigation remains available. Undo/redo operate on the
draft and invalidate a proposal when the document changes.

**Apply proposal** resolves affected material pins again and replays the shared
SDK commands. Canonical base/preview SHA-256 hashes bind the proposal to its exact
document, including its name. The reducer repeats validation at commit time to
prevent overwriting intervening edits. Only its successful acknowledgement adds
the Applied message. One batch is one history entry; undo/redo and normal
save/reopen preserve existing semantics. Apply does not save or publish. Changed
material revisions, invalid geometry or stale drafts leave the draft untouched.

## Conversation and cancellation

The most recent twelve entries live in React state only. Follow-ups to an
unapplied request combine the original directions and clarifications within the
planner's 1,000-character / 2,048-byte brief limit. Directions are never silently
truncated. Apply or **discard proposal and start a new request** resets request
context. Applied geometry enters the next request through the current document.
The transcript is not sent to the server, stored in browser storage or saved with
the component. Explicit **remember this** and recipe controls can copy selected
directions into a reviewed local pattern; see COMPONENT_MEMORY.md.

Cancel aborts planning and catalog preparation/rechecks. Late completions are
ignored even if an upstream implementation disregards cancellation. Leaving the
stage or opening another component aborts work and discards session conversation
and unapplied proposals. Manual edits during planning invalidate the response.
Existing draft discard and browser refresh warnings remain editor-owned.

Progress distinguishes AI planning, preview preparation and Apply rechecks.
Errors cover authentication, busy capacity, timeout, changed/unavailable materials
and stale proposals. Existing 175-second server and 180-second transport deadlines
remain. The earlier real-model plain-floor smoke timed out, so interactive model
latency remains a limitation; no fallback or relaxed resource policy is introduced.

## Transport and ownership

The browser posts `{contract_version:1, brief, document}` with optional bounded
`guidance` from explicit matching patterns to
`/api/component-construction/plan`. Vite and production `serve_ui.js` provide a
thin proxy to the AI service's dedicated `POST /construction/plan`. The nginx
examples map the same exact public URL to that dedicated capability and preserve
machine-inference blocks. The existing planner v1 response/error contract applies.

The AI browser router requires the configured trusted mutation origin even when
authentication is disabled, plus the existing enabled-user policy when required.
Authorization precedes JSON parsing. It admits six burst requests, refilling one
per ten seconds without identity tracking, and shares inference capacity/resource
checks. Body size is 1 MiB; query parameters and model/provider overrides are
rejected. Responses disable caching. Disconnect aborts the service operation.

No browser receives an AI machine credential. The UI proxy strips caller machine
and service tokens. Only explicit brief/document data enters planning, never
request/session objects. Existing session authorization remains SDK/main-auth
owned; the feature adds no identity/profile fields. No generated code, automatic
retry, peer delegation or automatic preference learning is introduced. Explicit
pattern persistence is browser-local through AppSettings, as documented separately.

## Files and checks

- `ComponentConversation.jsx` and styles own presentation; labels are registered
  in GamesText's `COMPONENT_PLANNER_TEXT` catalog.
- `useComponentPlanner.js` owns request context, lifecycle, cancellation, preview
  and reducer acknowledgement. `ComponentPlannerApi.js` owns fetch.
- `ComponentProposal.js` independently validates response shape, canonical hashes,
  affected references and SDK replay. Existing noble hashes support LAN origins
  where Web Crypto may not be available.
- `ComponentDocumentState.js` commits one independently checked atomic batch.
- `ComponentStage.jsx` selects the preview or draft for the existing renderer.

Run root `npm run test:construction-planner` for planner, browser route, proxy,
proposal/reducer and hook lifecycle tests with synthetic generation. Coverage
includes stale documents and hashes, invalid commands, late cancellation, edits
during planning/Apply, material failures, one-step undo/redo, auth-before-parse,
bounded requests and credential stripping. Production bundling checks JSX/imports.
Windows visual verification could not be completed: Computer Use stopped because
it could not confidently determine the current browser URL.

# Dense recipe proposals

Reviewed dense grass proposals may contain a `place-pattern` command. The SDK
expands its bounded instances into ordinary objects during preview and Apply.
The proposal reference collector resolves its shared asset pin; the existing
hash, cancellation, stale-scene checks and one-step undo/redo apply unchanged.
