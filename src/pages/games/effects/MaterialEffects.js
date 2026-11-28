import * as THREE from "three";
import { material_effects_or_empty } from "@fracto/sdk/FractoMaterialEffects.js";
import { create_fire_effect } from "./FireEffect.js";

// Attaches a material's validated effects (asset.json `effects`) to the node that
// holds the model in its source units. Shared by inventory previews and stages.
export function create_material_effects(effects, { cardinality } = {}) {
  const list = material_effects_or_empty(effects);
  const object = new THREE.Group();
  object.name = "material-effects";
  object.userData.inventory_effect = true;
  const items = list.map((effect) =>
    create_fire_effect(effect, { cardinality }),
  );
  for (const item of items) object.add(item.object);
  return {
    object,
    count: items.length,
    has_fire: list.some((effect) => effect.type === "fire"),
    update(delta, camera, viewport_height) {
      for (const item of items) item.update(delta, camera, viewport_height);
    },
    set_cardinality(value) {
      for (const item of items) item.set_cardinality(value);
    },
    dispose() {
      items.forEach((item) => item.dispose());
      object.removeFromParent();
    },
  };
}
