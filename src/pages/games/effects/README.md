# Material effects

Renderers for the `effects` a material lists in its `asset.json` (validated by
`@fracto/sdk/FractoMaterialEffects.js`). Effects are placed in the model's source units,
so attach `create_material_effects(list).object` to the node that holds the model before
any unit or preview scaling, and call `update(delta_seconds, camera, canvas_height)` from
the render loop. Every node is tagged `userData.inventory_effect` so material passes
(wireframe, map toggles) can skip it.

- `MaterialEffects.js` — builds all effects for a material; `set_cardinality(n | null)`
  previews another supported cardinality's flame color (`null` restores the saved one);
  `dispose()`.
- `FireEffect.js` — one fire: three noise-driven flame sheets that turn toward the camera
  around world up in the vertex shader, a soft glow, GPU sparks and a flickering
  point light scaled to the flame size. Colors are three stops (core, body, tip) built from
  the orbital pattern hue of the fire's `cardinality` (see the SDK's `fire_palette`). Blending is premultiplied "over" with extra emission, so flames read on
  both light and dark backgrounds. Flames and sparks cast no shadows.
  The anchor follows the model (position, scale and tilt), but flames, glow, sparks and the
  light always rise along world up, so a torch mounted at an angle (e.g. ±30° on a wall)
  still burns vertically.
  The light casts shadows (`shadows`, default on; visible where the renderer enables
  shadow maps, i.e. the components stage) and drifts slightly with the flame so the
  shadows dance. `light_offset` places it (x/z on the model's axes, y along world up),
  e.g. out in front of a torch so its crown and handle shadow fall on the wall behind.
  Each fire has its own motion identity, derived from its world position at its first
  update: start phase, drift rate and handedness, a slowly wandering tempo (about
  0.7×–1.3×) and flame-noise offset, so fires sharing a material flicker and cast
  shadows out of step, and each placement repeats the same way on every load.
  Light range/brightness and spark size are computed in world units, so a model scaled
  from centimetres to metres (e.g. the torch in a component) keeps a sensible fire.

The components stage (`ComponentStageContent.js`) attaches a material's effects to
every placed instance of its model (objects and scatters) and advances them in its
animation loop; an object's `flame_cardinality` overrides the fire color.

Tests: `test/material_effects.test.js` (structure, colors, timing) and
`test/sdk_material_effects.test.js` (format). Shaders are checked by rendering.
