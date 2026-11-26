// Effects can run before paint. Cross a painted frame, then start graphics in a
// separate task; StrictMode's discarded mount never creates a WebGL context.
export function defer_crt_initialization(initialize, target = window) {
  let active = true,
    frame = null,
    task = null,
    cleanup;
  frame = target.requestAnimationFrame(() => {
    if (!active) return;
    frame = target.requestAnimationFrame(() => {
      frame = null;
      if (!active) return;
      task = target.setTimeout(() => {
        task = null;
        if (active) cleanup = initialize();
      }, 0);
    });
  });
  return () => {
    if (!active) return;
    active = false;
    if (frame !== null) target.cancelAnimationFrame(frame);
    if (task !== null) target.clearTimeout(task);
    cleanup?.();
  };
}
