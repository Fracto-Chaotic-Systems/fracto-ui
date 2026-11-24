import { AnimationMixer, AnimationObjectGroup } from "three";

// One clip clock per cached material, bound to the untouched cloned loader
// roots. Stage placement/anchor/unit parents must never be animation targets.
export function create_component_animation() {
  const groups = new Map();
  let started = false,
    speed = 1;
  return {
    get active() {
      return started && speed > 0 && groups.size > 0;
    },
    add(source, clone) {
      if (!source.animations?.length) return;
      if (!groups.has(source))
        groups.set(source, { targets: [], clip: source.animations[0] });
      groups.get(source).targets.push(clone);
    },
    start(value = 1) {
      speed = value;
      for (const entry of groups.values()) {
        entry.group = new AnimationObjectGroup(...entry.targets);
        entry.mixer = new AnimationMixer(entry.group);
        entry.mixer.timeScale = speed;
        entry.mixer.clipAction(entry.clip).play();
        entry.mixer.update(0);
      }
      started = true;
    },
    update(delta) {
      if (started)
        for (const entry of groups.values()) entry.mixer.update(delta);
    },
    dispose() {
      for (const entry of groups.values()) {
        entry.mixer?.stopAllAction();
        if (entry.group) {
          // Group bindings are Composite objects, not root-node bindings;
          // release the group targets rather than mixer.uncacheRoot().
          entry.group.uncache(...entry.targets);
        }
      }
      groups.clear();
      started = false;
    },
  };
}
