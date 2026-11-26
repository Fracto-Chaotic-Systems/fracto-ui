import { preview_component_variant } from "@fracto/sdk/FractoComponentVariant.js";
import { validate_component_document } from "@fracto/sdk/FractoComponentDocument.js";

// Pinned authored delta: Ladybug zoomies v7, based on grass strip scene 17.
// Authoring edits never change game playback until this binding is updated.
export const PLAY_GRASS_VARIANT = {
  key: "ladybug-zoomies",
  name: "Ladybug zoomies",
  revision: 7,
  base: {
    component_id: "0bb37175-0459-49bf-b5fc-f918bf090563",
    scene_revision: 17,
  },
  role_groups: { walking_insects: "854b759b-83ed-42fc-929a-5b460126651e" },
  overrides: [
    {
      target: { role: "walking_insects", property: "motion.algorithm" },
      operation: "replace",
      value: "facing-wander-v1",
    },
    {
      target: { role: "walking_insects", property: "motion.speed_mps" },
      operation: "multiply",
      value: 8,
    },
    {
      target: { role: "walking_insects", property: "walk_clip.playback_rate" },
      operation: "multiply",
      value: 8,
    },
  ],
};

export function play_grass_variant_document(base, source_revision, key) {
  if (key !== PLAY_GRASS_VARIANT.key)
    throw new Error("unknown_play_grass_variant");
  const { document, clip_rates } = preview_component_variant(
    base,
    PLAY_GRASS_VARIANT,
    source_revision,
  );
  // The streamed player accepts per-object clocks. Resolve the semantic walk
  // multiplier there, preserving the inherited component clock for movement.
  for (const object of document.objects) {
    if (Object.hasOwn(clip_rates, object.id))
      object.animation_speed =
        (object.animation_speed ?? document.animation_speed ?? 1) *
        clip_rates[object.id];
  }
  return validate_component_document(document);
}
