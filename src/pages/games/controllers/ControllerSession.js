// A provider loads asynchronously, but mounting is synchronous and cancellable.
export function start_controller_session(
  load,
  host,
  { on_input, on_stick_reset, on_ready, on_error },
) {
  let cancelled = false;
  let controller;
  const ready = Promise.resolve()
    .then(load)
    .then((create) => {
      if (cancelled) return;
      controller = create(host, { on_input, on_stick_reset });
      on_ready();
    })
    .catch(() => {
      if (!cancelled) on_error();
    });
  return {
    ready,
    destroy() {
      if (cancelled) return;
      cancelled = true;
      controller?.destroy();
    },
  };
}
