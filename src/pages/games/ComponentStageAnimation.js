import { AnimationMixer, AnimationObjectGroup } from "three";

// One clip clock per cached material and playback rate, bound to the cloned loader
// roots. Stage placement/anchor/unit parents must never be animation targets.
export function create_component_animation() {
  const groups = new Map();
  const entries = () =>
    [...groups.values()].flatMap((rates) => [...rates.values()]);
  let started = false,
    speed = 1;
  return {
    get active() {
      return (
        started &&
        entries().some((entry) => (entry.clock_speed ?? speed) * entry.rate > 0)
      );
    },
    add(source, clone, rate = 1, clock_speed) {
      if (!Number.isFinite(rate) || rate < 0 || rate > 100)
        throw new Error("invalid_component_variant");
      if (
        clock_speed !== undefined &&
        (!Number.isFinite(clock_speed) || clock_speed < 0 || clock_speed > 10)
      )
        throw new Error("invalid_component_document");
      if (!source.animations?.length) return;
      if (!groups.has(source)) groups.set(source, new Map());
      const rates = groups.get(source);
      const key = `${clock_speed ?? "component"}:${rate}`;
      if (!rates.has(key))
        rates.set(key, {
          targets: [],
          clip: source.animations[0],
          rate,
          clock_speed,
        });
      rates.get(key).targets.push(clone);
    },
    start(value = 1) {
      speed = value;
      for (const entry of entries()) {
        entry.group = new AnimationObjectGroup(...entry.targets);
        entry.mixer = new AnimationMixer(entry.group);
        entry.mixer.timeScale = (entry.clock_speed ?? speed) * entry.rate;
        entry.mixer.clipAction(entry.clip).play();
        entry.mixer.update(0);
      }
      started = true;
    },
    update(delta) {
      if (started) for (const entry of entries()) entry.mixer.update(delta);
    },
    dispose() {
      for (const entry of entries()) {
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
