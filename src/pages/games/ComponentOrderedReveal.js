import { create_component_reveal } from "./ComponentStageReveal.js";

// Downloads stay parallel. Only presentation waits for the preceding category.
export function create_ordered_component_reveal({
  durations = [],
  holds = [],
  limit = 3,
} = {}) {
  const entries = new Set();
  const categories = new Set();
  let stage = 0,
    hold_elapsed = 0,
    sealed = false,
    disposed = false;
  const complete = () => sealed && stage > 3;
  return {
    expect(rank, blocking) {
      if (blocking) categories.add(rank);
      const entry = { rank, blocking, reveal: null, root: null };
      entries.add(entry);
      return (root) => {
        if (disposed) return;
        entry.root = root;
        root.visible = false;
        entry.reveal = create_component_reveal(root, durations[rank]);
      };
    },
    seal() {
      sealed = true;
    },
    get complete() {
      return complete();
    },
    get prepared() {
      return (
        sealed &&
        ![...entries].some((e) => e.blocking && e.rank === 0 && !e.reveal)
      );
    },
    release(rank) {
      limit = Math.max(limit, rank);
    },
    get active() {
      return !complete() || [...entries].some((entry) => entry.reveal?.active);
    },
    update(delta) {
      if (disposed) return;
      const pending = [...entries].some((e) => e.blocking && e.rank === stage);
      // Never spend the same frame delta twice across consecutive categories.
      for (const entry of entries) {
        if (!entry.reveal || entry.rank > stage || entry.rank > limit) continue;
        entry.root.visible = true;
        entry.reveal.update(delta);
        if (!entry.reveal.active) entries.delete(entry);
      }
      if (sealed) {
        while (stage <= 3) {
          if (stage > limit) break;
          const required = [...entries].filter(
            (e) => e.blocking && e.rank === stage,
          );
          if (required.some((e) => !e.reveal || e.reveal.active)) break;
          if (categories.has(stage)) {
            hold_elapsed += pending ? 0 : delta;
            if (hold_elapsed < (holds[stage] ?? 0)) break;
          }
          stage++;
          hold_elapsed = 0;
          // The next nonempty category starts fading on the next frame.
          if ([...entries].some((e) => e.rank === stage)) break;
        }
      }
    },
    dispose() {
      disposed = true;
      for (const entry of entries) entry.reveal?.dispose();
      entries.clear();
    },
  };
}
