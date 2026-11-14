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

The controller is horizontally centered, 1rem above the game area's lower edge,
including when the game area enters fullscreen.
The settings drawer overlays it normally. Game simulation is not implemented yet;
the input store is the integration point for future gameplay.

`ControllerActions.js` maps standard buttons and stick directions to action codes;
stick movement has a 20% dead zone. `ControllerActions.jsx` shows active actions in
tooltip-style boxes centered between the controller halves, aligned 1rem above
the game area's bottom edge (the screen bottom in fullscreen). The boxes use 1rem
dark text on a light background. Labels come from AppText. The overlay does
not intercept pointer input. The persisted display setting **controller actions**
defaults off. Labels disappear on release, reset, disconnection, or when disabled.
Only the enabled overlay subscribes to input updates; the adapter is unchanged.
