# Flight instruments

Night-flight lighting is controlled by the enlarged photographic switch in the
unused half-cell left of the centered heading indicator. Layouts without that
space use a fallback beside the controller, keeping the upper dials and dashboard
shoulders tightly fitted. Its shared
boolean preference comes from the dashboard. Scoped SVG styles illuminate text
and white markings in warm amber, dim horizon fills, and light the nameplates;
each dial also has its own soft amber crescent along the upper-left inside rim
(11 o'clock),
fading down into the face like a concealed lamp. The circular overlay scales
with the instrument, appears only at night, and does not intercept input.
the dependency's SVGs and live telemetry remain intact. The switch never changes
instrument pointer behavior or adds width to the instrument group.
When the switch shares the heading row, the heading dial and nameplate shift
right together to equalize the space on either side of the dial. The switch
position, size, upper instrument row, and dashboard contour remain fixed.

`FlightInstrumentGroup.jsx` renders selected `flight-indicators` instruments on
each side of the controller. The default left group contains airspeed, attitude,
and heading; the right contains altitude, vertical speed, and turn coordination.
Wide groups use up to two columns, centering the last gauge when the count is odd.
Compact groups use up to three columns, stacked above the controller by the parent.

`GamesPlayControls.jsx` owns dock placement and passes instrument pixel size and
compact mode. `GamesPlayControlsLayout.js` calculates those sizes from the game
area's measured width and height, including fullscreen. The instrument groups
do not intercept pointer input. Labels and accessible names use GamesText.
Instrument labels resemble brushed-metal nameplates with uppercase engraved dark text,
1px letter spacing, and
a decorative rivet at each end. Plates retain the existing 16px caption height,
scale their text with gauge size, and hide below 64px as before.
Depth follows distance from the wood: nameplates use a tight 2px shadow,
instrument silhouettes a medium 5px blur, and the controller silhouette a wide
14px blur. Dark shadows fall down and right from an upper-left light source,
with larger offsets on elements further from the wood. Controller help overlays
remain outside the shadow filter.

## Instrument customization

The Settings drawer's **instruments** section is owned by
`FlightInstrumentSettingsPanel.jsx`. It supports a master visibility switch,
small/medium/large sizes (80/112/144px caps), airspeed and pressure units, speed
and vertical-speed ranges, pitch limit, animation duration, and a left/right/hidden
placement per instrument. Sizes shrink to fit the available game area and the
number of instruments on each side. Empty groups and an entirely hidden instrument
panel consume no instrument rows; the controller remains available.
If the available space would shrink gauges below 48px, the dock temporarily
shows only the controller and an **enlarge area to show instruments** hint.
Saved instrument selections are retained and restore automatically when the
area grows. The hint remains a single line, with its full text in a tooltip.

`FlightInstrumentSettings.js` defines defaults, safe normalization, instrument
selection, and speed conversion. `useInstrumentSettings.js` subscribes to the
persisted `games/play_instruments` object through AppSettings. Its serialized
external-store snapshot avoids new object identities on unchanged reads.
Partial placement updates preserve other instruments. Reset restores only
instrument defaults. Changes are applied live and do not modify flight telemetry.

Airspeed can display knots, km/h, or m/s. Its reading, maximum scale, colored
speed bands, and accessible label are converted together. The stored maximum
remains in knots when changing units. Pressure supports hPa and inHg, converting
the supplied pressure value as well as its label. The dependency's altimeter
uses feet and its vertical-speed dial uses ft/min; these are stated in settings.
The airspeed dial defaults to 500 knots and covers at least the full flight
envelope. Previously saved 200-knot ranges normalize to 500, including when
displaying km/h or m/s. Color-band thresholds scale with the maximum so their
angles match the original 200-knot dial: green ends at 64.5% of the scale,
yellow ends and the red marker sits at 81.5%. At 500 knots those boundaries are
322.5 and 407.5 knots. White and green starting points scale proportionally too.
Display ranges are normalized to 500–1000 knots, pitch 10–90°, vertical speed
500–10000 ft/min, and animation 0–1000ms (0 disables it). Invalid persisted
options fall back to defaults; finite out-of-range numbers are clamped.

## Flight-state ownership

`FlightState.js` exports `create_flight_state(initial_state)`, the immutable
`INITIAL_FLIGHT_STATE` for gameplay, and `PREVIEW_FLIGHT_STATE` for fixtures.
GamesPlay creates one store per mounted game page,
separate from controller input and settings. Its snapshot is not persisted.
`get_snapshot()` returns the same frozen object until values change;
`subscribe(callback)` returns an unsubscribe function. `update(patch)` merges
known fields atomically and only notifies listeners when normalized values change.
`reset()` restores that store's initial snapshot values.

| Field                | Unit / meaning                                            |
| -------------------- | --------------------------------------------------------- |
| `source`             | `preview`, `live`, or `unavailable`                       |
| `position_re`, `position_im` | Complex-plane position; north is +imaginary, east is +real |
| `altitude_world`     | Strictly positive distance above the flat complex plane |
| `camera_heading_deg` | Look yaw offset from craft forward, clockwise, [0, 360) |
| `camera_pitch_deg`   | Look elevation offset in the craft frame, -90 through 90 degrees |
| `pitch_deg`          | Degrees, positive nose up, bounded to -90 through 90      |
| `roll_deg`           | Degrees, positive right wing down, wrapped to [-180, 180) |
| `heading_deg`        | Degrees, wrapped to [0, 360)                              |
| `airspeed_knots`     | Knots, nonnegative                                        |
| `altitude_ft`        | Feet, signed                                              |
| `vertical_speed_fpm` | Feet/minute, positive climbing                            |
| `turn_rate_deg_s`    | Degrees/second, positive right turn                       |
| `slip`               | Dimensionless, bounded to [-1, 1]                         |
| `pressure_hpa`       | hPa, positive                                             |

Missing, nonnumeric, or nonfinite fields retain their previous value; unknown
fields are dropped. Nonpositive pressure retains its last valid value. Store
values are not limited to gauge display ranges. Without a seed, a store starts
with source `unavailable`, zero motion, and standard pressure 1013.25 hPa.

`FlightInstrumentModel.js` translates the unit-bearing telemetry contract into
package props. `FlightInstrumentGroup.jsx` uses `useSyncExternalStore` directly;
telemetry updates do not rerender GamesPlay, the dock, or the controller.
`FlightInstrumentStatus.jsx` subscribes only to the source string. Accessible
instrument names include current readings, units, and source status.

Gameplay starts stationary at complex position (-0.5, -2), world altitude 1
(2500ft), heading north (0°), with the camera facing north and level, and zero
pitch, bank, climb, and turn rate. Preview fixtures retain their historical
90-knot/45° readings. `FlightSimulation.js` publishes live
readings from mapped controller commands. Preview and live status captions are
hidden; accessible instrument labels still identify their source. Unavailable
telemetry retains its last readings and shows **no flight data**. Reset restores
the seed used to create that store; starting a new game page creates fresh flight
state. Live telemetry is not saved with instrument or control preferences.

## Controller-driven flight

`FlightDynamics.js` is a pure, bounded game-flight step. Direct pitch and roll
commands change attitude; default left-stick sideways movement also banks, and
forward/back movement joins the speed command. Analog triggers/assigned speed
buttons increase or decrease airspeed. A bank produces a coordinated turn;
assigned yaw input adds turn rate and moves the slip ball. Speed and pitch
determine world motion and vertical-speed telemetry. Look channels change the
craft-relative camera yaw and pitch offsets at up to 90°/s, without changing
aircraft attitude or travel direction. Horizontal viewing wraps through 360°;
vertical viewing clamps at ±90° relative to the craft. Releasing the stick
retains those offsets while the view follows subsequent turns, climbs, descents,
and banks. Discrete confirm/cancel/pause/view actions remain
available to future game UI consumers.

Full input changes pitch by 20°/s and bank by 40°/s. Speed-up/slow-down
commands (the default triggers) change speed by 100 knots/s, so a 0.1-second
full press changes airspeed by 10 knots. Partial trigger pressure scales this
rate proportionally. The movement stick retains fine speed adjustment at
10 knots/s; combined speed commands are capped at ±100 knots/s.
The on-screen d-pad applies 10% button strength for fine adjustments by default;
hold Shift for full strength. Shift can be changed while holding a direction.
Both on-screen joysticks use quarter strength by default; Shift restores full
strength. Scaling follows dead zone, sensitivity, and inversion processing.
Pitch is limited to ±30°, bank to ±60°, speed to 0–500 knots, and turn rate to
±12°/s. These game-model bounds are independent of instrument display ranges.
Pressure is retained from the flight-state store. Mid-step attitude/speed and
heading are used for integration so common frame rates agree closely.

`FlightUnits.js` calibrates 1 world unit as 2500ft. At world altitude `h`, world
speed is `airspeed_knots * (6076.11549 / 3600) / 2500 * h` units/second.
Pitch separates forward speed into horizontal and vertical components; roll
controls turning, not sideways translation. Speed cannot become negative, so
braking ends in a hover. Airspeed remains the commanded reading even as world
motion slows near the plane. The simulation publishes altitude as `h * 2500`
feet and vertical speed as the instantaneous derivative in ft/min.

Descent solves `dh/dt = k*h` exponentially and integrates horizontal travel
using mean altitude over the step. It never intersects the plane. Numerical
guards at world altitudes 1e-100 and 1e100 prevent floating-point under/overflow;
these are far beyond indexed tile detail, and vertical speed is zero at either
guard. World altitude updates must be positive; invalid updates retain the last
valid altitude. The simulation owns synchronization of world altitude and gauge
readings; direct telemetry updates remain supported for instrument fixtures.

Clicking a joystick neutralizes the values assigned to its axes: the default
left stick resets bank and airspeed; the right resets look yaw and pitch.
`neutralize_flight_channels` preserves world position/altitude/heading and
unrelated controls, and updates motion readings immediately. The simulation
subscribes to these discrete requests and removes that subscription on cleanup.

Releasing input holds speed and attitude. An existing bank continues turning,
and an existing pitch continues climbing/descending. Disconnected controls
freeze the flight state. The animation-frame loop reads the command store and
updates telemetry directly, without React state updates to GamesPlay/controller.
It caps elapsed time at 100ms, suspends on blur/hidden documents, clears the clock
on resume, and cancels its frame/listeners on cleanup. Starting from an effect
supports StrictMode cleanup without leaking loops. The worker pipeline below
renders its world state above a flat complex plane; terrain and aerodynamic/stall
modeling remain outside this game model.

Run `npm run test:flight-indicators` for store and package checks. The separate
`/scripts/flight_state_smoke.html` fixture exercises subscriptions, changing
readings/status, reset, unmount/remount, and parent render isolation.

## Validation — 2026-11-15

Validated with React/ReactDOM 19.2.4, flight-indicators 1.1.0, Node 22.23.5, and
Vite 7.3.6 in the development container and the in-app Chromium browser.

- `npm run test:game-controller`: 30 passing checks.
- `npm run test:flight-indicators`: 13 passing checks, including every one of
  729 left/right/hidden placement combinations at eight dimensions (5,832
  configurations), heading normalization, malformed telemetry, and cramped-area
  recovery without changing saved preferences.
- Scoped ESLint, Prettier, production application build, and production bundling
  of the integration fixture pass. The application retains its existing Vite
  warning about chunks larger than 500kB.
- Browser heading 359 to 1 changed the card transform from `rotate(1deg)` to
  `rotate(-1deg)`, confirming the 2-degree shortest path with a 300ms transition.
- Invalid telemetry retained finite last-good readings; missing telemetry showed
  **no flight data**. No SVG NaN/Infinity values were produced.
- Sixty animation-frame telemetry updates left the game parent render count at
  four. Instrument/state subscribers updated independently of the controller.
- Actual controller button input recorded **confirm**; a joystick drag recorded
  movement (peak normalized magnitude 0.475). Both returned to no active commands
  on release, and instrument overlays did not intercept their hit targets.
- Synthetic touch-pointer press/up and press/cancel sequences through the actual
  controller target recorded **confirm** and cleared commands. Physical
  touchscreen/gesture testing was not available and remains unverified.
- A 600×360 viewport exercised the readable-size fallback with the controller
  retained; enlarging to 600×850 restored all six gauges inside the game area.
- Instrument units and cross-button assignments persisted across gameplay-page
  reload. Original values were restored after checking. Switching to keyboard
  removed the controller; restoring on-screen input mounted exactly one host.
- Automated fullscreen entry/exit, rejection, Escape synchronization, and cleanup
  pass. Fresh browser fullscreen requests returned **not granted**, including
  retries. The production UI kept its switch unchecked/enabled and showed its
  localized error. A successful native fullscreen cycle was not confirmed in
  this validation run; fullscreen-size geometry is covered by the layout tests.

`/scripts/flight_validation.html` is the repeatable, isolated integration fixture.
It mounts the production dock/controller/mapping/instruments, makes preferences
memory-only, provides telemetry boundary/stream buttons, and records last action,
pointer type, peak movement, telemetry frames, and parent render count. Its touch
buttons deliberately synthesize touch PointerEvents during a real pointer press;
they are not physical touchscreen tests. The final clean fixture session produced
no browser warnings or errors. This historical validation used synthetic
telemetry; the production game now uses the controller-driven model above.

## Live-control verification — 2026-11-16

- 50 tests pass: 20 flight-state/instrument/dynamics checks and 30 controller/UI
  checks. Dynamics tests cover frame-rate consistency, analog input, direct and
  default movement commands, remapping/inversion, release, bounds/ground, heading
  wrap, disconnect, background pause/resume, and idempotent cleanup.
- Native on-screen D-pad up produced pitch -12.5°, vertical speed -1972.36ft/min,
  and decreasing altitude. D-pad right produced 17° bank and a 3.71°/s turn.
- Right-trigger dragging increased speed from 90 to 91.25 knots; left-trigger
  dragging decreased it to 89.81 knots. Speed remained steady after release.
- A left-stick drag changed bank from 17° to 14.88°, with heading and turn rate
  following the bank. Returning from Overview created one fresh controller and
  restored level flight at the initial 90 knots/2500ft/heading 45°.
- Scoped lint, formatting, and the production build pass. The existing Vite
  large-chunk warning remains.

## World-flight dynamics verification — 2026-11-18

- 47 focused state, dynamics, controller, fullscreen, and layout checks pass,
  including cardinal-direction travel, altitude scaling, 2000 seconds of
  exponential descent, braking to hover, retained camera orientation, mapped
  right-stick input, frame-rate agreement, and background/disconnect cleanup.
- Scoped ESLint, Prettier, and diff whitespace checks pass.
- The broader instrument checks and production build cannot complete because
  the local `flight-indicators` dependency is missing. The broader suite also
  reports a 768px width failure in the unchanged custom instrument-count layout
  check. Scene rendering and browser visual verification belong to later steps.

## Ray-to-plane projection

`FlightProjection.js` is the pure numerical stage before tile selection and
coloring. It imports no browser, rendering, network, or terrain dependencies.
The world axes are real/east, imaginary/north, and altitude/up; the infinite
complex plane is at altitude zero. The default camera follows craft heading,
pitch (the direction of travel), and roll. Descent shifts the horizon upward,
ascent shifts it downward, and banking tilts it opposite the craft's roll.
`camera_heading_deg` and `camera_pitch_deg` store retained look offsets rather
than absolute world angles. Projection builds the craft's heading/pitch basis,
banks its right/up vectors, then applies local look yaw followed by look pitch.
The composed orthonormal basis stays defined at local vertical views without
clamping the resulting world elevation or using Euler-angle addition.

`create_flight_projection(state, { width_px, height_px, vertical_fov_deg, fisheye_strength })`
compiles an immutable camera with a default vertical field of view of 60°.
Gameplay enables a mild fish-eye lens by default; Display → fish-eye lens is a
persisted 0–100 slider. Its cubic mapping spans numerical strengths 0–64,
providing fine control near zero. The numerical API defaults to 0 for a pinhole
camera; gameplay initially uses 0.35 (about 18% on the slider). The new numeric
preference inherits the old toggle until first edited: off becomes 0 and on
becomes 0.35. Invalid saved values recover this default; explicit zero is retained.
For screen coordinates
`h,v`, the unnormalized ray is `(1-k*(h²+v²))*forward + h*right + v*up`, with
`k` normalized by the viewport corner radius. This keeps center rays unchanged,
widens peripheral rays, and curves an off-center horizon. It is a bounded radial
fish-eye approximation. Extreme strengths allow rear-facing rays and can enclose
the horizon as a complete circle when the view points downward. At exactly level
forward viewing, the horizon remains through the center; the lens does not
change the craft-relative center direction. Numerical overflow checks account
for the longer unnormalized rays at high strengths. The existing ray
pass includes the effect without extra pixels, image copies, or per-pixel
trigonometry. Lens changes invalidate pending frames and retain the worker/cache.
Raster dimensions must be positive safe integers, field of view strictly between
0° and 180°, camera coordinates/attitude finite, altitude positive, and craft
pitch and look pitch individually within ±90°.
Headings wrap clockwise from north. Rays pass through pixel centers, using a
top-left raster origin, square pixels, and a horizontal field of view derived
from aspect ratio. Exact vertical views preserve a stable right direction.

`flight_ray_for_pixel(projection, x, y)` returns a unit `{ re, im, up }` ray.
`trace_flight_pixel(projection, x, y)` returns a numeric `kind`; plane hits also
include `position_re`, `position_im`, and `distance_world`. Kind constants are:

- `FLIGHT_RAY_SKY` (0): ray points away from the plane.
- `FLIGHT_RAY_HORIZON` (1): absolute vertical component of the unit ray is at
  most 1e-12, avoiding unstable divisions for almost-parallel rays.
- `FLIGHT_RAY_PLANE` (2): finite forward intersection with the plane.
- `FLIGHT_RAY_UNREPRESENTABLE` (3): intersection or ray distance exceeds the
  finite number range. This differs from missing tile coverage.

`trace_flight_frame(projection, output?)` returns row-major typed arrays indexed
by `y * width_px + x`: `kinds` (`Uint8Array`) and `position_re`/`position_im`
(`Float64Array`). Only plane entries have coordinates; every miss writes `NaN`,
including when reusing an output buffer. `create_flight_intersections(width, height)`
allocates a compatible buffer. Reuse requires matching dimensions and array
types/lengths. Projection/state inputs remain unchanged; only an explicitly
provided output is mutated. Camera objects can be structured-cloned and output
array buffers can be transferred to workers. The raster loop uses row-level
geometry and no per-pixel objects or routine ray normalization.

This stage does not clip intersections to tile bounds or choose colors. Tile
availability, adaptive refinement, painting sky, and canvas integration follow
in later implementation steps.

Run `npm run test:flight-projection` (or
`node --test test/flight_projection.test.js`). Ten projection tests cover analytic
coordinates, cardinal directions, pole views, perspective/aspect ratio, 960
pixel comparisons across camera poses, buffer reuse, horizon/overflow cases,
invalid input, and worker transfer. Combined with the focused state/controller
checks, 57 tests pass. Scoped ESLint, Prettier, and diff whitespace checks pass.

## Numerical tile access and browser cache

`FlightTileClient.js` connects the tile service to the per-game
`FlightTileCache.js`. Create a client once for a game session and call `destroy`
on cleanup. The module is ready for the adaptive renderer; it does not start
requests just by importing it. `TilesBackend.tile` and `tile_availability` use
the configured tile-service origin, credentials, and caller cancellation.

The shared SDK `FractoTileGeometry.js` converts intersections to canonical tile
codes at levels 3–34, computes bounds, and selects native `(i, j)` samples.
Southern coordinates use conjugate symmetry (`abs(im)`), matching the existing
2D renderer. Real coordinates outside [-2, 2) or imaginary magnitude above 2
have no tile code; an absent indexed tile is also a coverage gap. Level 34 is
the current index format ceiling, not a promise of available detail everywhere.
Sampling uses the existing rounded/clamped 256-sample convention, including
shared tile edges; point-to-code selection assigns one canonical tile.

Client API:

- `availability(codes, { signal }?)` checks up to 256 candidate codes, returning
  booleans from the service's loaded index. It does not fetch numerical tiles.
- `load(code, { signal }?)` returns a decoded tile, or `null` for a known index
  miss. Errors such as source read failures remain rejected and retryable.
- `peek(code)` synchronously reads an already decoded tile and updates its
  recency, with no request. Tile `values` is an interleaved `Float64Array`:
  pattern at `2 * (j * 256 + i)`, iteration at the following index. Signed
  samples are preserved; null source samples become two `NaN` values. Treat
  cached arrays as read-only. Bounds and envelope metadata are immutable.
- `retain(codes)` aborts outstanding tile requests no longer needed by the
  latest view. A batched availability request remains useful if any of its
  codes are retained. Cached tiles remain until LRU eviction.
- `clear()` empties data/metadata and cancels pending work; `destroy()` also
  permanently rejects new requests. `get_stats()` exposes current occupancy.

Defaults bound the owned decoded cache to 64 tiles/64 MiB, metadata to 1024
entries, outstanding/queued requests to 256, and active transports to four.
Options can lower these budgets. Caller-retained arrays and transient JSON
transport allocations are outside the decoded-cache byte count. Identical tile
requests and identical sorted availability batches share one transport. Cancelling
one subscriber leaves other subscribers active; the last cancellation aborts
the transport. Obsolete results cannot repopulate a cleared/destroyed cache.

Availability metadata expires after five seconds, including confirmed misses.
Transient errors and invalid payloads are never negative-cached. Responses carry
the source mode, generation, and index fingerprint as a source identity. A changed
identity clears existing data and cancels other requests, rejecting the detecting
request with `TILE_SOURCE_CHANGED`; retry against the new source. Changes are
detected on service responses; cached data alone cannot detect a server restart.
Aborting HTTP requests does not cancel shared SDK tile loading on the server.

Run `npm run test:flight-tiles` from the repository root for the service, geometry,
cache, and production adapter checks, or from the UI directory for cache/adapter
checks. The 15 checks include real local HTTP round-trips, bounded eviction and
queuing, shared-request cancellation, stale completions, source changes, malformed
responses, retry behavior, mirrored/deep coordinate boundaries, and credentials.
The combined focused flight/controller/tile suite has 72 passing tests.

## Adaptive numerical refinement

`FlightRefinement.js` connects projected intersections with the tile client.
Create `create_flight_refinement(client, options?)` once per game, then call
`sample(intersections, output?)` for each frame. Sampling is synchronous and
returns the best currently cached numerical values; it starts bounded asynchronous
availability/loading work for subsequent frames. It never waits for network I/O,
colors samples, calculates uncovered Mandelbrot points, or paints a canvas.
`settled()` waits for the current pass when needed by a fixture or caller; normal
animation can continue sampling while requests are in flight. Loaded results never
mutate an already returned frame.

The catalog starts from the level-3 roots containing visible plane intersections.
It descends through previously justified child regions and chooses the deepest
finite sample already cached for each pixel. Missing/sparse children use their
nearest valid cached parent. Duplicate detection compares the exact canonical
`(tile code, i, j)` identity, not numerical values or screen adjacency. Every
pixel participating in a collision justifies only its immediate child region;
unrelated siblings and singleton regions do not trigger loading. Collisions at
the maximum level are accepted, including mirrored north/south points. Previously
justified detail remains available to later frames until metadata/data eviction.
This is progressive refinement, not a claim of a globally minimal tile cover.

The frame result uses row-major buffers:

- `values`: interleaved `Float64Array` pattern/iteration pairs. Misses are two
  `NaN` values; signed values are retained unchanged for whole-frame coloring.
- `levels`: selected tile depth per pixel, or zero for no numerical tile sample.
- `tile_codes`, `tile_indices`, `sample_indices`: the frame's compact tile table
  and exact sample provenance. Misses have indices -1.
- `unresolved_count`: plane hits still needing numerical data, including points
  outside tile bounds. Sky/horizon pixels are excluded; their classification
  remains in the input intersection buffer.
- `duplicate_count`, `max_depth_duplicate_count`, `catalog_limited`: refinement
  diagnostics. A maximum-depth collision is valid output, not a loading error.

`create_flight_sample_buffer(width, height)` allocates a reusable compatible output.
Sampling resets every buffer field on reuse, including misses and provenance.
Inputs remain unchanged; supplied outputs must be separate from input arrays.
Per-frame working memory scales with raster size; catalog metadata holds no decoded
tile arrays outside the client's existing memory budget.

Defaults allow depth through level 34, 4096 catalog records, and at most 64 pending
refinement requests (also at most 64 new requests per pass). Availability is batched
in groups of at most 256. Deferred work is reconsidered on later samples. Metadata
uses LRU eviction of regions unused by the current frame. Missing/transient loads
retry no sooner than 1000ms, subject to the client's existing availability TTL.
`get_stats().last_error` records the most recent load error until reset; normal
missing coverage is not an error. Source changes discard remembered paths.

Requests no longer relevant to the view are cancelled. Cancelling one child of a
shared availability batch leaves the batch alive for other retained children.
`reset()` cancels owned work, clears the catalog, and releases pins; `destroy()`
also prevents future sampling. The caller still owns and must dispose the tile
client separately.

The cache's `pin(codes)` replaces the set of resident tiles protected from LRU
eviction. Each sampled frame pins its used tiles while children load. If all cache
capacity is pinned, child admission reports `FLIGHT_TILE_CACHE_BUDGET`, preserving
the current frame's fallback and staying within the byte/tile limits. Known budget
exhaustion is detected before requesting another numerical tile. A later frame
replaces the pins, allowing no-longer-used parents to be evicted normally.

Run `npm run test:flight-refinement` in the UI directory for 16 refinement checks,
or from the repository root to include cache and service integration checks.
The combined focused flight/controller/tile/refinement suite has 89 passing tests,
covering local child selection, progressive reuse, missing/sparse parents/children,
level-34 termination, cache/catalog/request budgets, cancellation, source changes,
reusable buffers, and real projection input. Scoped lint, formatting, and whitespace
checks pass.

## Whole-frame coloring and worker pipeline

`FlightFramePipeline.js` runs projection → adaptive numerical sampling → bounded
calculation fallback → whole-frame palette → RGBA. It reuses intersection/sample
buffers at the current raster dimensions. `FlightFrameColors.js` derives the SDK
escaped/inner/outer tone maps from every valid numerical plane sample in the
current frame, then writes one RGBA pixel per ray. It does not color tiles
independently or reuse a previous frame's palette. Signed samples are retained;
tone lookup uses absolute iterations and hue uses absolute pattern. SDK fixes
cover the pattern-20000 hue-table boundary and fractional iteration palette keys.

Sky, horizon, and unresolved plane/numerical-miss colors are explicit configurable
RGBA arrays, with opaque blue/pale-blue/dark defaults. Non-plane rays and unknown
samples do not influence the numerical palette. Coloring never changes sample
values. Frame-local color caching, runs of identical histogram entries, native
duplicate tables, and frame-local catalog traversal contexts reduce repeated
work without persisting colors between frames. The duplicate scratch pool retains
at most 64 native tables (16 MiB); reset/destroy release it.

`FlightFrameFallback.js` calculates plane hits lacking finite tile/parent samples,
including areas outside indexed coverage, with the SDK zero-seed calculator.
Every new missing plane sample first receives an at-most-16-iteration escape
prefix using the SDK's zero seed, radius-10 bailout and iteration numbering.
Proven escapes are valid numerical samples immediately, including during camera
motion; this avoids deferred dark patches across ordinary exterior regions.
The default then allows at most 2048 longer point calculations and approximately
4ms of that longer calculation work per frame, with a 10000-iteration recurrence
horizon per point. `escape_iterations` configures the prefix (0 disables it);
`max_calculations: 0` disables both paths for fixtures and benchmarks.
The time limit is checked between points; an individual bounded SDK calculation
cannot be interrupted. Unconverged estimates are kept unknown instead of being
presented as known numerical data. Errors and iteration-limited points remain
explicit in diagnostics. Sky/horizon rays are never calculated.

The fallback memoizes attempts by pixel and exact complex coordinates in reusable
arrays proportional to raster size. Stable views progressively fill deferred
points across frames; camera motion invalidates changed coordinates. Tile samples
always take precedence. Limited/error attempts are not retried at an identical
point until reset or source change; newly arriving tiles can still replace them.
Scan/reuse time is excluded from the calculation-work budget so large cached
prefixes cannot prevent progress on later pixels.

`FlightFrame.worker.js` owns the production pipeline, tile cache, refinement
catalog, and calculation memoization. `FlightTileTransport.js` accepts the tile
origin already discovered on the UI thread, preserving direct-service or
`/api/tiles` paths, credentials, cancellation and source-aware errors. The worker
does not import UI origin discovery or require DOM/canvas APIs. It returns
transferred `Uint8ClampedArray` RGBA pixels plus stage timings and cache,
refinement and calculation diagnostics.

Use `create_flight_frame_client({ cache_options?, pipeline_options? })` from
`FlightFrameClient.js` after normal service-port discovery. The client exposes:

- `render(state, {width_px, height_px, vertical_fov_deg?}, colors?)`: returns a
  promise for `{width_px, height_px, pixels, stats}`. It snapshots the view and
  keeps only one active render plus one latest queued view. Superseded requests
  reject with `AbortError`; their completed frames are recycled automatically.
- `release(frame)`: call after consuming/painting pixels. It transfers the RGBA
  buffer back to the worker, detaching the caller's pixel array. Release is
  idempotent; only frames issued by this client are accepted.
- `cancel()`: rejects outstanding views and requests a numerical/catalog reset.
- `destroy()`: rejects outstanding work, removes listeners and terminates the
  worker. Worker/message failures also settle promises and terminate cleanly.

The worker holds at most two recycled RGBA buffers, clearing them on byte-size
changes. Caller-owned frames remain allocated until released or discarded; paint
before release. Schedule normal successive renders after the preceding promise
settles, reading the latest flight snapshot each time. Submitting replacements
faster than the worker finishes intentionally discards superseded output and can
prevent any frame from being published. Tracing/calculation in an active worker frame is synchronous and
cannot be interrupted by a newer view, but stale output is never presented by the
session. A default 4194304-pixel ceiling guards allocation; configure
`pipeline_options.max_pixels` explicitly if a larger raster is required. The page
integration below selects resolution, paints the canvas and owns lifecycle
cleanup. No request loop starts merely by importing these modules.

Run `npm run test:flight-frames` in the UI directory for 18 palette, fallback,
pipeline, protocol and lifecycle tests. The root command also runs three existing
SDK canvas regressions. The bundled production worker is exercised across a real
Node worker boundary with local HTTP tile fetches and transferable buffers; this
is complemented by Chromium/page verification below. Scoped lint, formatting and
syntax checks pass; the complete integrated suite is described below.

`npm run benchmark:flight-frames` compares pinhole and fish-eye modes using
cached uniform level-3 samples with no network/calculation. It alternates modes
through 30 warmup frames, then measures 15 frames per mode with alternating
pair order. A local Node 22.19.0 run on 2026-11-18 recorded these total medians:

| Raster | Pinhole | Fish-eye |
| --- | --- | --- |
| 320×180 | 11.68ms | 12.94ms |
| 640×480 | 74.23ms | 76.99ms |
| 1280×720 | 185.99ms | 182.04ms |

At 640×480, the full-pipeline difference was about 3.7%. A separate warmed
ray-only comparison against the preceding implementation measured 2.78ms
before versus 3.10ms with fish-eye (about 0.32ms added). Timing noise and the
visible tile footprint affect the result; these CPU fixture numbers do not
predict EC2 or browser frame rates. Wider peripheral coverage may require
additional tiles in real scenes. Pixel budgets, cache bounds, and adaptive
resolution remain unchanged. Sampling/coloring continue to dominate cost.
These measurements use mild strength 0.35, rather than the extreme slider maximum.

## Gameplay canvas integration — 2026-11-18

`GamesPlay.jsx` mounts `FlightScene.jsx` inside the measured/fullscreen game
content area. Its viewport absolutely fills that area at z-index -1 within the
existing isolated stacking context, below dashboard, controller, settings and
drawer. The canvas never intercepts pointer events. Existing controls and preferences
retain their layout and behavior; the view has an accessible label and a
localized failure message with Retry when canvas/worker startup or rendering fails.

`FlightSceneRuntime.js` requests one frame at a time, paints with ImageData and
`putImageData`, releases transferred pixels, then schedules the next request on
animation-frame timing using the latest flight snapshot. It does not subscribe
React to per-frame telemetry. Resize/DPR/fullscreen changes preserve aspect;
frames for old dimensions are discarded. Blur/hidden documents pause scheduling
and invalidate pending views, and focus/visibility resume with current bounds.
Zero-sized content starts no worker or render loop. Cleanup cancels RAFs, removes
listeners and destroys the client exactly once, including StrictMode teardown.

`FlightResolution.js` starts with a 57600-pixel budget and targets 32ms work per
frame. It skips two warmup measurements, smooths subsequent costs, reduces after
three slow measurements and grows after twelve fast measurements. Budgets stay
between 14400 and 518400 pixels, and output never exceeds the available native
raster at up to 2× display density in the default Fill available space mode.
Display settings also offer a persisted 640 × 480 pixels canvas mode. This mode
uses an exact 640×480 raster independent of DPR and adaptive budgets, centers
horizontally when space permits, and starts at the content area's top edge,
directly below the game title bar. Its viewport scrolls on smaller play areas so
the fixed canvas can be reached in full. Switching modes invalidates pending
frames while preserving the existing worker and tile cache.

Display → canvas mode selects **cinema** (the default rectangle) or **porthole**
(a 640px-diameter circle). Cinema keeps the existing fill/640×480 preference
under **cinema size**. That size selector is disabled in porthole mode and its
value is retained for the return to cinema. The shape preference persists as
`games/play_canvas_shape`; unknown values fall back to cinema. Porthole renders
a square 640×640 raster with the correct 1:1 projection aspect, then the canvas
element clips it with a 50% border radius. This avoids stretching a 4:3 image
into a circle. It stays horizontally centered and top-aligned below the game
title, with scrolling when needed, and mode switches keep the worker/cache.

`/scripts/flight_scene_validation.html` composes the production scene, simulation,
controls, mapping and instruments in StrictMode with memory-only preferences.
Visible diagnostics show frame/raster/work/tile counts, worker lifetime, parent
renders, exact world altitude and current craft/camera readings. Buttons select
repeatable north/overview/very-low-altitude/sky views, unmount/remount the scene,
and deliberately fail startup to exercise the real Retry UI. No production flight
state or preference persistence is replaced by this fixture.

Validation completed against the development stack's real numerical tile service:

- `npm run test:flight` from the repository root: 125 passing checks, including
  scene scheduling/painting/failure cleanup, adaptive resolution, fullscreen
  lifecycle geometry, controllers, instruments, refinement, tile access, worker
  transport, palettes, calculation fallback and SDK canvas regressions.
- The missing local declared `flight-indicators@1.1.0` package was restored for
  verification, without changing package versions or lock files. Its ESM/CJS
  checks pass. An outdated 768px layout assertion reserved removed horizontal
  spacing; it now matches the unchanged dock's actual 64px rim allowance.
- Feature catalog validation and its six regression checks pass. Game play is
  registered as implemented; the knowledge bundle is regenerated and checked.
- Full production Vite bundling includes the dedicated flight worker and passes.
  The existing application warning for chunks above 500kB remains. Scoped ESLint,
  formatting and whitespace checks pass.
- Chromium gameplay starts at 0 knots/heading 0°/2500ft, with scene below the
  dashboard and usable settings. Leaving for Overview and returning creates the
  same fresh initial state. Right-stick drag retained camera heading 17.48° while
  craft heading stayed 0°. Left-stick drag produced 2.37 knots and forward world
  displacement; held pitch-down produced -14.67° and about -60.86ft/min with
  positive decreasing altitude. Those telemetry updates left the fixture parent
  at four renders; instruments and scene updated independently.
- Real tile rendering converged to zero unresolved samples in the stationary
  overview. A representative desktop frame used 408×230 rays at about 26ms work;
  a portrait view used 372×664 rays at about 27ms, and a cheap sky view reached the
  native 507×794 raster. These are observations from this machine, not guaranteed
  rates. Very-low altitude 1e-10 stayed valid while deeper tiles were fetched.
- Desktop and 390×844 CSS portrait geometry retain the controller and fit the
  canvas. Scene hide/show displayed workers 1→0→1. A deliberate startup failure
  showed the real localized alert and Retry recovered to one worker. No
  flight-specific browser errors were observed; the full app retains its existing
  React list-key warning.
- Native fullscreen requests were rejected by the in-app browser. Its switch
  stayed off and displayed the existing localized error. Successful native
  fullscreen entry/exit and physical touchscreen/hand-held operation remain
  unverified; automated entry/exit/rejection, cleanup and changed-size geometry
  checks pass.
