import { AnimationMixer } from "three";

// Bind to the untouched loader root; framing/scaling belongs to its parent.
// One authored clip plays at a time so alternative actions are never blended.
export function create_inventory_animation(root) {
  const clips = root.animations || [];
  const mixer = clips.length ? new AnimationMixer(root) : null;
  if (mixer) {
    mixer.clipAction(clips[0]).play();
    mixer.update(0);
  }
  return {
    count: clips.length,
    update(delta) {
      mixer?.update(delta);
    },
    dispose() {
      mixer?.stopAllAction();
      mixer?.uncacheRoot(root);
    },
  };
}
