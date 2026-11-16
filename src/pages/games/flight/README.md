# Flight instruments

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
Display ranges are normalized to 20–1000 knots, pitch 10–90°, vertical speed
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

Gameplay starts in level flight at 90 knots, heading 45°, and altitude 2500ft,
with zero pitch, bank, climb, and turn rate. `FlightSimulation.js` publishes live
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
determine vertical speed and altitude. Look channels remain camera intent and
do not alter aircraft attitude. Discrete confirm/cancel/pause/view actions remain
available to future game UI consumers.

Full input changes pitch by 20°/s, bank by 40°/s, and speed by 10 knots/s.
Pitch is limited to ±30°, bank to ±60°, speed to 0–300 knots, and turn rate to
±12°/s. Altitude has a zero-foot floor; downward vertical speed becomes zero at
the floor. These game-model bounds are independent of instrument display ranges.
Pressure is retained from the flight-state store. Mid-step attitude/speed are
used for altitude and heading integration so common frame rates agree closely.

Releasing input holds speed and attitude. An existing bank continues turning,
and an existing pitch continues climbing/descending. Disconnected controls
freeze the flight state. The animation-frame loop reads the command store and
updates telemetry directly, without React state updates to GamesPlay/controller.
It caps elapsed time at 100ms, suspends on blur/hidden documents, clears the clock
on resume, and cancels its frame/listeners on cleanup. Starting from an effect
supports StrictMode cleanup without leaking loops. This is a simple instrument-
driving flight model; terrain, rendering a flight scene, and aerodynamic/stall
modeling are separate work.

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
