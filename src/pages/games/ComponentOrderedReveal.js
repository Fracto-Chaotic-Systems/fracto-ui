import { create_component_reveal } from "./ComponentStageReveal.js";

// Downloads stay parallel. Only presentation waits for the preceding category.
export function create_ordered_component_reveal({
  durations = [],
  holds = [],
  limit = 4,
  cue_seconds = null,
} = {}) {
  const entries = new Set();
  const categories = new Set();
  let stage = 0,
    hold_elapsed = 0,
    sealed = false,
    disposed = false,
    clock_complete = false,
    last_rank = 3;
  const complete = () =>
    cue_seconds
      ? sealed &&
        clock_complete &&
        ![...entries].some((entry) => entry.blocking)
      : sealed && stage > last_rank;
  return {
    expect(rank, blocking) {
      last_rank = Math.max(last_rank, rank);
      if (blocking) categories.add(rank);
      const entry = { rank, blocking, reveal: null, root: null, elapsed: 0 };
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
    update(delta, seconds) {
      if (disposed) return;
      if (cue_seconds) {
        if (!Number.isFinite(seconds)) return;
        for (const entry of entries) {
          const cue = cue_seconds[entry.rank];
          if (!entry.reveal || entry.rank > limit || seconds < cue) continue;
          entry.root.visible = true;
          // Initial assets sample the music clock; late streamed sections retain
          // a gentle arrival fade without delaying any other material's cue.
          const elapsed = entry.blocking
            ? Math.max(0, seconds - cue)
            : entry.elapsed + delta;
          entry.reveal.update(Math.max(0, elapsed - entry.elapsed));
          entry.elapsed = elapsed;
          if (!entry.reveal.active) entries.delete(entry);
        }
        const last = cue_seconds.length - 1;
        clock_complete =
          seconds >= cue_seconds[last] + (durations[last] ?? 1.2) &&
          limit >= last;
        return;
      }
      const pending = [...entries].some((e) => e.blocking && e.rank === stage);
      // Never spend the same frame delta twice across consecutive categories.
      for (const entry of entries) {
        if (!entry.reveal || entry.rank > stage || entry.rank > limit) continue;
        entry.root.visible = true;
        entry.reveal.update(delta);
        if (!entry.reveal.active) entries.delete(entry);
      }
      if (sealed) {
        while (stage <= last_rank) {
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
