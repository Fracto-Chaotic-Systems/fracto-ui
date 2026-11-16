# Game controllers

GamesPlay owns a `ControllerInput` store. Game code reads its immutable, standard
Gamepad-shaped snapshots or subscribes to changes; it never imports a vendor API.
Snapshots contain only `connected`, four axes, and eighteen buttons with `value`,
`pressed`, and `touched`. Axes are clamped to -1–1 and button values to 0–1.

`GameController.jsx` observes the AppSettings device preference and owns the React
lifecycle. `ControllerProviders.js` maps device codes to asynchronous loaders.
Each loader returns a synchronous factory taking a host element and `{ on_input }`,
and returning `{ get_snapshot, subscribe, reset, destroy }`. Replace `on_screen`'s
loader to swap libraries without changing gameplay. Cancelled loads never mount.
`ControllerSession.js` handles asynchronous loading, cancellation and disposal.
React owns the host wrapper and errors; the adapter alone owns its empty inner div.
Keyboard and hand-held providers are future slots; selecting either removes the
on-screen controller and clears input.

`VirtualGamepadAdapter.js` is the only module importing virtual-gamepad-lib 0.3.3
and its bundled SVG/CSS. `VirtualGamepadRuntime.js` wraps its emulator, display and
API wrapper.
`VirtualGamepad.css` hides the preset's pink trigger direction arrows and the
Forward captions below both sticks. Trigger and joystick input remains active.
`VirtualGamepadSkin.js` adds mirrored shell gradients and soft radial highlights
to the bundled SVG. `ControllerColors.js` supplies ten palettes for the persisted
**controller color** display setting, defaulting to blue. The CSS adds a rim and
shadow to each grip. Palette variables inherit from the React-owned host, so colors
change live without remounting the controller or resetting held inputs. Invalid
saved colors fall back to blue.
Decoration is applied before mounting, without editing the dependency or changing
the button geometry, tap targets, or standardized input contract.
The runtime chooses a free native gamepad slot, disables merging with physical
controllers, forwards normalized input, and resets on blur, hidden documents,
and pointer cancellation. Before cleanup it finishes active pointers so the
package's document drag listeners are released. Cleanup stops polling, removes
the emulated pad, restores the native API, and clears the host.

`GamesPlayControls.jsx` owns the controller's placement and size. The controller
is horizontally centered, 1rem above the game area's lower edge, including when
the game area enters fullscreen. Flight instruments flank it in wide areas and
form compact rows above it below 768px. Instrument selection and side placement
are configurable in Settings. The controller host fills its assigned
slot and keeps action boxes anchored between its halves.
The settings drawer overlays it normally. `flight/FlightSimulation.js` reads
mapped commands and updates the flight-state store; the raw input adapter stays
independent of that time-based model.

`ControllerActions.js` is a pure helper for deriving effective action codes from
raw input and normalized control preferences. The default sticks retain the
single “move around” and “look around” labels without direction boxes.
`ControllerActions.jsx` shows active actions in
tooltip-style boxes centered between the controller halves, aligned 1rem above
the game area's bottom edge (the screen bottom in fullscreen). The boxes use 1rem
dark text on a light background. Labels come from AppText. The overlay does
not intercept pointer input. The persisted display setting **controller actions**
defaults off. Labels disappear on release, reset, disconnection, or when disabled.
Only the enabled overlay subscribes to mapped commands. Mapping remains bound
for the game loop independently of whether the help overlay is shown.

## Custom flight controls

`FlightControlSettings.js` defines the eighteen standard button slots, four axis
slots, semantic actions, channel names, defaults, and preference normalization.
The Settings drawer's **control** section renders `FlightControlSettingsPanel.jsx`:
**response** contains dead zone (0–90%), sensitivity (0.1–3×), and pitch inversion;
**stick axes** assigns a channel or unassigned plus inversion per axis;
**button assignments** assigns an action or unassigned to each button.
`useFlightControlSettings.js` reads/subscribes/saves the persisted
`games/play_flight_controls` object through AppSettings. Partial nested edits
preserve other bindings. Reset restores only flight-control defaults, leaving
device, controller appearance, help visibility, and instruments unchanged.

`FlightControlMapping.js` translates raw input into normalized command intent.
It removes each axis's dead zone, rescales the remaining travel to 0–1, applies
sensitivity, and clamps to [-1, 1]. Per-axis inversion is applied before channel
mapping; global pitch inversion applies to all pitch signals from axes/buttons.
Analog button values are retained, so a half trigger yields half speed intent.
Multiple bindings are allowed: signed contributions sum and clamp, opposing
signals cancel. Active help actions are deduplicated, though opposing held
actions may both be listed even when their resulting channel cancels to zero.

`FlightControls.js` creates the per-page command store and binds it to input and
preferences from a GamesPlay effect. Initialization is inert, so discarded React
StrictMode initializers cannot leak subscriptions. Binding immediately computes
the current snapshot; preference edits recompute held input. Cleanup unsubscribes
both sources and clears commands, and is idempotent. Raw input release, blur,
visibility reset, device changes, and disconnect flow through to neutral commands.

Snapshots are immutable and have stable identity until their values change:
`connected`; `move_x`, `move_y`, `look_x`, `look_y`, `pitch`, `roll`, `yaw`, `speed`
in [-1, 1]; deduplicated `actions`; and `action_values` with magnitudes in [0, 1].
Positive movement/view channels mean right, forward, and up. Roll/yaw positive
means right; speed positive means speeding up. Pitch uses -1 for **nose down**
and +1 for the existing **tail up** action wording. Default Y axes are inverted
so pushing up gives positive forward/upward input. Axis remapping retains that
axis inversion unless changed. Buttons mapped to **move around**/**look around**
publish generic actions; directional movement/view amounts come from axis bindings.

The command store describes held intent, not one-shot events. `FlightSimulation`
integrates continuous channels into the separate `flight/FlightState.js` store.
Default `move_x` adds bank input and `move_y` adds speed input. `look_x`/`look_y`
remain view intent. A future game UI consumer can detect rising edges for
confirm/pause/etc. Mapping itself remains pure; simulation scheduling pauses on
blur/hidden pages and cleans up on unmount. Keyboard and hand-held providers
remain future work.

Help text uses `FLIGHT_CONTROL_ACTION_TEXT`, not physical button names, so a
reassigned cross button and an inverted pitch axis display their effective
actions. `CONTROL_INPUT_TEXT` labels the physical inputs in the settings UI.
Old controller text keys remain available for compatibility.

Run `npm run test:game-controller` for mapper/session and controller regressions.
`/scripts/flight_controls_smoke.html` exercises production preferences and help
against held synthetic inputs; restore defaults after changing fixture mappings.
