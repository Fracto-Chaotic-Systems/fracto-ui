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
`AbortSignal`, and `report_progress(progress, detail)`. It must resolve only
when its work is complete. A task must never be marked complete merely because
work was queued; the operation should await the actual completion signal from
its worker or server before resolving. `detail` is optional, operation-specific
display data and is exposed by the engine as `operation_detail`.

## Shared operation library

Reusable operations belong in `AutomationOperationLibrary.jsx`, rather than in
a page-specific adapter. Each operation is exposed by a factory such as
`create_countdown_operation(options)`, which returns an unnamespaced operation
definition. Register it into the caller's registry with
`AutomationOperationLibrary.register(registry, definition)`. Registration adds
the `common_` namespace, preventing a common operation from colliding with a
page operation. Use `common_automation_operation_name()` when a task needs the
qualified identifier; do not concatenate the prefix in a page adapter. The
task's operation list must use the resulting namespaced identifier (for
example, `common_countdown`).

Shared operations must remain independent of React and page state. They may
use the operation context, report progress or detail, and honor the supplied
`AbortSignal`, but ownership of lifecycle state remains with
`AutomationEngine`. A new common operation should include a factory, JSDoc
describing its options and completion contract, and direct tests covering
normal completion and cancellation where applicable.

The countdown operation is the first shared implementation. It reports the
remaining whole seconds as operation detail, waits between each count, and
clears its detail when complete. Non-finite duration values are treated as a
zero-length countdown, and a missing signal is supported for simple callers;
engine-managed executions still receive cancellation through `AbortSignal`.
Tiles uses it as `common_countdown`; other pages can register and sequence the
same operation without importing Tiles code.

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
