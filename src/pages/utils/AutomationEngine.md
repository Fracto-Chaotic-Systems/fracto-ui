# AutomationEngine integration

`AutomationEngine` is the page-independent coordinator for automation jobs. It
does not know how a task performs its work. A page supplies that behavior by
registering operation definitions with `AutomationOperationRegistry`.

## Integration pattern

1. Convert the persisted job into the engine task shape. Each task contains an
   ordered `operations` array and caller-owned `data`.
2. Register one operation for each operation name used by the page.
3. Construct an `AutomationEngine` with the job, registry, lifecycle callbacks,
   and optional runtime context.
4. Call `start()`, `pause()`, `resume()`, or `cancel()` from the page’s mode
   controls.
5. Persist `on_checkpoint` values after successful operation boundaries when a
   job must survive a page or process restart.
6. Use `on_progress` and `on_event` for UI status and diagnostics; the engine
   itself has no logging or rendering dependency.

An operation receives the current task, its indexes, the shared runtime, an
`AbortSignal`, and `report_progress(progress)`. It must resolve only when its
work is complete. A task must never be marked complete merely because work was
queued; the operation should await the actual completion signal from its
worker or server before resolving.

## Tiles integration boundary

Tiles automation already claims jobs and stores task data, including the
operation code, level, shortcodes, focal point, and scope. The remaining page
specific step is to provide an executor that performs one of those tile tasks
and resolves when its tile work is actually complete. Until that executor is
defined, the existing Tiles operator and automation controls remain unchanged;
this prevents the engine from falsely reporting a claimed job as complete.

When that executor is available, it can be registered without changing the
engine:

```js
const registry = new AutomationOperationRegistry().register({
  name: "tiles_task",
  max_retries: 2,
  run: (context) => execute_tiles_task(context.task.data, context),
});
const engine = new AutomationEngine(job, registry, callbacks, runtime);
await engine.start();
```

Different pages can register different operation names and task data while
sharing the same sequencing, pause/resume, cancellation, retry, checkpoint,
progress, and event behavior.
