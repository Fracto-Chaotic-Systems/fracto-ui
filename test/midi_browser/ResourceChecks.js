// Test-only resource accounting; imported before the harness mounts React.
export const pending_frames = new Set();
export const pending_intervals = new Set();
const request = window.requestAnimationFrame.bind(window);
const cancel = window.cancelAnimationFrame.bind(window);
window.requestAnimationFrame = (callback) => {
  const id = request((time) => {
    pending_frames.delete(id);
    callback(time);
  });
  pending_frames.add(id);
  return id;
};
window.cancelAnimationFrame = (id) => {
  pending_frames.delete(id);
  cancel(id);
};
const interval = window.setInterval.bind(window);
const clear = window.clearInterval.bind(window);
window.setInterval = (...args) => {
  const id = interval(...args);
  pending_intervals.add(id);
  return id;
};
window.clearInterval = (id) => {
  pending_intervals.delete(id);
  clear(id);
};
export function resource_counts(contexts) {
  return {
    pending_frames: pending_frames.size,
    pending_intervals: pending_intervals.size,
    open_contexts: contexts.filter((context) => context.state !== "closed")
      .length,
    connected_product_nodes: contexts.reduce(
      (sum, context) =>
        sum +
        context.product_nodes.filter((node) => node.test_connected).length,
      0,
    ),
    source_callbacks: contexts.reduce(
      (sum, context) =>
        sum +
        context.product_nodes.filter(
          (node) => typeof node.onended === "function",
        ).length,
      0,
    ),
  };
}
