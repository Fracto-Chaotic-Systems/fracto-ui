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
