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
  around the fire's up axis in the vertex shader, a soft glow, GPU sparks and a flickering
  point light scaled to the flame size. Colors are three stops (core, body, tip) built from
  the orbital pattern hue of the fire's `cardinality` (see the SDK's `fire_palette`). Blending is premultiplied "over" with extra emission, so flames read on
  both light and dark backgrounds. No shadows are cast.

Tests: `test/material_effects.test.js` (structure, colors, timing) and
`test/sdk_material_effects.test.js` (format). Shaders are checked by rendering.
