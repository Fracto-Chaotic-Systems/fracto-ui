# UI tests

- `minibrot_terrain_cache.test.js` verifies selected-ID job submission, polling,
  duplicate prevention, failure recovery and stale-result suppression on unmount.

This directory contains Node.js tests for UI behavior and pure feature helpers.
Run a focused suite with its `test:*` script in `package.json`; tests use the
built-in `node:test` runner and do not require a browser unless noted.

- `simulator_terrain.test.js` verifies scope-relative height, sample/texture
  orientation, standard colors, missing-data holes, full 1000/1500/2000-edge geometry,
  3500/5000 edge limits and detail requests using memory-bounded fixtures,
  progressive detail, worker transfers/cancellation, stale results and cleanup.
  It also checks Gaussian smoothing, normalized missing-data handling,
  unchanged source data/colors, scope/25 bounds and fixed 100% worker smoothing.
  Lighting tests check bounded persisted settings, shader integration and uniform
  updates without terrain reloads or geometry/texture replacement.
  Progress tests cover stage ordering, measurable construction percentages,
  preview/detail resets, stale-message suppression and failure cleanup.
  Camera regression tests ensure resolution changes and reloads preserve zoom,
  orbit and pan, while selecting a different navigator region refits the view.

- `admin_commit_timeline.test.js` verifies commit timeline grouping and
  presentation helpers.
- `admin_reference_tree.test.js` verifies construction and restoration of the
  Reference page's repository tree.
- `admin_servers_address_book.test.js` verifies URL normalization, duplicate
  merging, invalid-input preservation, and serialization above the default
  AppSettings object-size limit, plus validation of the remote health contract.
- `auth_callback_error.test.js`, `authenticated_entry.test.js`, and
  `welcome_auth_states.test.js` verify login callback errors, authenticated
  entry navigation, and welcome-page authentication states.
- `automation_engine.test.js` verifies page automation scheduling and state
  transitions.
- `circuitry_audio.test.js` and `circuitry_audio_controller.test.js` verify
  circuitry audio behavior and its controller.
- `orbital_pipeline_contract.test.js` verifies the UI contract for orbital
  processing.
- `video_edit_history.test.js` verifies video-edit history behavior.

`admin_server_clients.test.js` covers client-table refresh overlap, selected-server
unmount handling, and empty versus restricted results. `remote_server_clients.test.js`
checks direct/nginx discovery and ensures remote requests never include cookies.

## Mesh transforms

`mesh_heat_map.test.js` verifies navigator request parameters, canvas level
filtering, cancellation and late-response rejection during navigation,
revision/namespace polling, selection preservation, timeout/retry behavior,
rebuild-generation changes even when namespace and revision repeat,
unmount cleanup, and sizing within the endpoint's rounded pixel limits.
Run with `npm run test:mesh-heat-map`.
`mesh_coverage_table.test.js` checks Generate-compatible columns, plain numeric
counts, exact differences, shades and a read-only table without checkbox selection.

mesh_transform_operations.test.js verifies explicit start, captured region/level/count, stop/resume accounting, stale responses, mode guards and the exact operation heading. Run npm run test:mesh-heat-map for these and heat-map/table tests.

mesh_tile_preview.test.js verifies browser/server codec parity, standard palette equivalence, scope/25 relief, immutable cached geometry, request races, height changes, failure recovery and teardown. Included in test:mesh-heat-map and test:mesh-transform.

simulator_mesh.test.js covers manifest-driven loading, persistent-worker reuse, checksum rejection, geometry transfer avoidance, GPU geometry reuse/disposal, mirrored placement, clipping, camera preservation, stale responses and local lighting/wireframe controls. Run npm run test:simulator. simulator_terrain.test.js retains regression coverage of the prior numerical helpers and lighting shader.

simulator_lod.test.js covers camera distance, visibility, the eight-patch limit, hysteresis, failed quartet suppression and stale request rejection. simulator_mesh.test.js additionally exercises child-load fallback and mixed-level worker assembly. These are included in test:simulator.

`simulator_welding.test.js` covers horizontal/vertical edge equality, four-way corner equality, reflected neighbors, invalid/absent geometry, 2:1 transitions in all four directions, collapsed edge coordinates, missing boundary segments, immutable buffers/colors, shader-lighting composition, override reuse and disposal after coarsening. Run npm run test:terrain-welding or test:simulator.

`simulator_escape_relief.test.js` compares escape scaling against a full terrain
rebuild with multiplied source iterations, including the escape/pattern boundary,
missing samples, logarithm, cap and smoothing. It also verifies immutable stored
attributes and unchanged pattern interiors. Worker integration checks geometry
invalidation, reuse and restoration at 1×. Included in `test:simulator`.
The 100× jagged-boundary regression checks reduced maximum adjacent height steps
with radius-four smoothing while preserving plateau elevations.

`simulator_navigation.test.js` exercises the real Three.js controllers against
event surfaces: switching preserves rolled/underside poses, only one controller's
listeners remain, fly mode starts stationary, local forward movement works, held
input is cleared on replacement, and disposal removes keyboard handlers.
Powered-flight tests additionally check continuous acceleration, gentle throttle
deceleration, immediate pause, non-repeating Space toggles, resume from rest,
30/120fps equivalence, capped/invalid deltas, throttle limits, bank turning,
unrestricted pitch and focus-gated input.

Scope/instrument tests cover proportional complex-plane speed and altitude at
different navigator scales, signed underside clearance, missing surfaces and use
of the installed region's scope. Instrumentation skips surface queries when off.
Surface tests verify interpolation, mirrored placement, holes and equal/mixed
level shader-welded edges, including restoration after coarsening.

Flight/LOD tests cover speed-dependent lookahead, direction reversal, underside
flight, pause/zero speed, blocked groups, the eight-patch/two-predictive budgets,
and movement during an outstanding request. Controller integration confirms
existing terrain remains displayed during detail loads and on failures; worker
tests continue to verify atomic child-quartet fallback.

Region tests cover inside/outside start poses, narrow aspect ratios, preservation
of inverted/underside poses, signed/unrestricted altitude, directional warnings,
first crossed edge, pause and return-to-start without a base reload. Controller
checks include waiting for terrain, region-change invalidation, resolution-only
pose retention and rejecting a return to an obsolete region's start.

- `wordnet.test.js` covers noun parsing, abstraction graph extraction, multiple
  inheritance, cycle/missing-link rejection, incremental tree expansion, and
  generated dictionary integrity. Run `node --test test/wordnet.test.js`.

- `worlds_mapping.test.js` checks factorization, saved
  mapping validation, and contender consistency with WordNet source senses.

- `worlds_draft.test.js` checks all proposal layers (318 placements, including every cardinality 1-256), compound arithmetic,
  verified WordNet subtype paths, and preservation of user edits on reload.

`node --test test/worlds_database.test.js` verifies database mapping adaptation,
including senses absent from the contenders list and rejection of invalid rows.

`node --test test/worlds_csv.test.js` verifies CSV ordering, factors, edited notes,
Unicode BOM, escaping, multiline values and empty-table headers.

`node --test test/wordnet_navigation.test.js` covers theme links resolving to
materialized WordNet branches, including every current contender sense.

WordNet navigation tests also verify the three-generation detail tree, leaf
entries, shared occurrence paths and cycle protection.

`node --test test/worlds_navigation.test.js` verifies targeted table scrolling,
sticky-header clearance, and safe handling of missing or invalid targets.

World navigation tests also cover independent theme-list scrolling and missing
theme targets.

`node --test test/wordnet_layout.test.js` checks reference splitter bounds and
restoring a saved width into a smaller container.

World database and CSV tests verify that stored world_name values, including
custom names, survive response adaptation and export.

`node --test test/worlds_notes_data.test.js` verifies removal of obsolete note
caches without reading them, plus expected-value saves and response validation.

- `markdown_document.test.js` loads the real shared renderer and worlds notes
  through Vite in middleware mode, checking matching reference typography,
  heading sizes, lists/tables, component overrides, safe links, and explicit
  trusted-HTML opt-in. Run from the UI directory with
  `node --test test/markdown_document.test.js` (also supported in fracto-dev).

`worlds_references.test.js` verifies valid world reference targets and preservation of source text, existing links and code.

- `midi_parser_compatibility.test.js` characterizes midi-parser-js 4.0.4: PPQ,
  tempo, running status, channels, controllers, formats 0/1, SMPTE detection,
  and the required unknown-metadata interpreter workaround. Run with
  `node --test test/midi_parser_compatibility.test.js`. The production adapter is
  tested separately by midi_events.test.js.

- `midi_events.test.js` verifies the plain MIDI adapter: track tempo merging,
  sustain/channel isolation, FIFO overlapping notes, controller resets, safe
  parsing bounds, malformed files, parser hook cleanup and legacy export tails.
  Run `node --test test/midi_events.test.js test/midi_parser_compatibility.test.js`.


- `midi_playback_controller.test.js` verifies playback lifecycle and stale-work
  cancellation, including MIDI channel/sustain integration. `midi_scheduler.test.js`
  checks audio-clock scheduling and independent voices; `midi_sample_cache.test.js`
  checks sample mappings, caching, concurrency, failures and memory bounds.
  `midi_audio_fakes.js` supplies deterministic Web Audio and timer test doubles.
  Run `npm run test:midi` for all MIDI suites. A separate Chromium offline
  render is documented in the games MIDI verification report.


- `midi_browser/` is a reproducible browser integration harness for the actual
  All Music page and hook under StrictMode. It verifies real piano output,
  silent Stop/replacement, replay/completion, context closure, and stale file
  reads. See midi_browser/README.md for the loopback command and generated WAV.
  Expanded MIDI Node suites also cover nonzero context clocks, long notes,
  partially scheduled chord failures, late sample exhaustion, decode retry,
  and 50 Play/Stop cycles without timers or connected voices remaining.

- `midi_display_model.test.js` checks timed display metadata, inferred defaults,
  stable IDs, frozen shared notes, format-0 channel routes, conductor/empty
  tracks and shared-channel sustain/program state. Included in `test:midi`.
  The browser harness also checks immutable song exposure and reference stability.

- `midi_track_geometry.test.js` verifies fit/zoom bounds, center anchoring,
  readable ruler intervals, clipping, long-note interval queries, virtualization
  and a 100,000-note index. Included in test:midi. Browser TrackChecks.js verifies
  actual note pixels, selected labels, scroll alignment, fit/resize, 64-track
  virtualization, 10,000-note density rendering and replacement reset.

- `midi_track_playback.test.js` checks note-state boundaries, follow clamping,
  simultaneous/default event lanes, independent pedal intervals, and one
  audio-clock animation loop with cancellation. The controller suite also
  checks lead-in and replay identity. Browser SyncChecks.js checks real playhead
  accuracy, held-to-sustained transitions, current tempo/meter/pedal values,
  follow-off scrolling, follow-on recentering, Stop and completion states.

- `midi_mixer.test.js` covers route independence, mute/solo precedence, multiple
  solos, volume/pan normalization, live ramps, bus allocation cleanup,
  preparation/replay/replacement state, and preserved unsupported-route errors.
  Included in test:midi. Browser MixerChecks.js measures actual volume, stereo
  pan, mute/solo silence, reset, replacement, Stop and context cleanup.

midi_instruments.test.js covers verified-only providers, per-note original program/bank resolution, provider/version cache isolation, immutable assignments and cancellation/reset/disposal. Browser InstrumentChecks.js exercises actual assignment controls and captured output silence.

Step 6 adds completion/stale-callback and 20-cycle combined controller lifecycle regressions (79 total MIDI tests). Browser ResourceChecks.js accounts for frames, intervals, contexts, product connections and source callbacks; SyncChecks.js also tests audio suspension with a longer six-second fixture. The revised browser run remains pending tool access.


Current instrument migration coverage: 103 MIDI tests (`npm run test:midi`).
`midi_asset_engine.test.js` covers catalog URLs/gates, chunk cache integrity,
memory, bounded voices, cancellation and refresh. `midi_instrument_choices.test.js`
covers live catalog names, coverage and disabled inventory. `midi_browser_capture.test.js`
checks PCM capture after all source inputs disconnect. `midi_asset_engine_probe.mjs`
uses actual HTTP/WAV bytes with a deterministic decoder stub. The browser harness
independently verifies native playback; dated JSON evidence is in midi_reports/.
See ../src/pages/games/music/ASSET_MIGRATION.md for current results and setup.
