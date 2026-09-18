import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const engine_source = await readFile(
  new URL("../src/pages/utils/AutomationEngine.jsx", import.meta.url),
  "utf8",
);
const tiles_operations_source = await readFile(
  new URL(
    "../src/pages/tiles/generator/TilesAutomationOperations.jsx",
    import.meta.url,
  ),
  "utf8",
);
const operation_library_source = await readFile(
  new URL("../src/pages/utils/AutomationOperationLibrary.jsx", import.meta.url),
  "utf8",
);
const tiles_source_without_imports = tiles_operations_source.replace(
  /^import[\s\S]*?;\r?\n/gm,
  "",
);
const {
  AutomationEngine,
  AutomationOperationRegistry,
  AUTOMATION_ENGINE_CANCELLED,
  AutomationOperationLibrary,
  common_automation_operation_name,
  create_countdown_operation,
  create_tiles_operation_registry,
  normalize_tiles_automation_job,
} = await import(
  `data:text/javascript,${encodeURIComponent(
    `${engine_source}\n${operation_library_source}\n${tiles_source_without_imports}`,
  )}`
);

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

test("runs the shared countdown and reports remaining seconds", async () => {
  assert.equal(
    common_automation_operation_name("countdown"),
    "common_countdown",
  );
  assert.throws(
    () => common_automation_operation_name("common_countdown"),
    /must be unnamespaced/,
  );
  const registry = new AutomationOperationRegistry();
  AutomationOperationLibrary.register(
    registry,
    create_countdown_operation({ duration_seconds: 2, interval_ms: 1 }),
  );
  const details = [];
  const progress = [];
  const operation = registry.get("common_countdown");

  const result = await operation.run({
    signal: new AbortController().signal,
    report_progress: (value, detail) => {
      progress.push(value);
      details.push(detail);
    },
  });

  assert.deepEqual(details, [2, 1, null]);
  assert.deepEqual(progress, [0, 0.5, 1]);
  assert.deepEqual(result, {});
});

test("cancels the shared countdown through its abort signal", async () => {
  const operation = create_countdown_operation({
    duration_seconds: 2,
    interval_ms: 10,
  });
  const controller = new AbortController();
  const running = operation.run({
    signal: controller.signal,
    report_progress: () => controller.abort(),
  });

  await assert.rejects(running, /countdown cancelled/);
});

test("propagates shared countdown detail through AutomationEngine", async () => {
  const registry = new AutomationOperationRegistry();
  AutomationOperationLibrary.register(
    registry,
    create_countdown_operation({ duration_seconds: 1, interval_ms: 1 }),
  );
  const observed_details = [];
  const engine = new AutomationEngine(
    { tasks: [{ operations: ["common_countdown"] }] },
    registry,
    {
      on_progress: (state) => observed_details.push(state.operation_detail),
    },
  );

  const state = await engine.start();

  assert.deepEqual(observed_details, [1, null]);
  assert.equal(state.operation_detail, null);
  assert.equal(state.state, "complete");
});

test("normalizes invalid countdown values and allows a signal-free zero run", async () => {
  const operation = create_countdown_operation({
    duration_seconds: Number.POSITIVE_INFINITY,
    interval_ms: Number.NaN,
  });
  const details = [];

  const result = await operation.run({
    report_progress: (_, detail) => details.push(detail),
  });

  assert.deepEqual(details, [null]);
  assert.deepEqual(result, {});
});

test("executes operations sequentially and reports progress", async () => {
  const order = [];
  const progress = [];
  const registry = new AutomationOperationRegistry()
    .register({
      name: "first",
      run: async ({ report_progress }) => {
        order.push("first:start");
        report_progress(0.5);
        order.push("first:end");
        return { value: 1 };
      },
    })
    .register({
      name: "second",
      run: async () => {
        order.push("second:start");
        order.push("second:end");
      },
    });
  const engine = new AutomationEngine(
    { tasks: [{ operations: ["first", "second"] }] },
    registry,
    { on_progress: (state) => progress.push(state.progress) },
  );

  const state = await engine.start();

  assert.equal(state.state, "complete");
  assert.deepEqual(order, [
    "first:start",
    "first:end",
    "second:start",
    "second:end",
  ]);
  assert.equal(state.operations_completed, 2);
  assert.equal(state.progress, 1);
  assert.deepEqual(progress, [0.25]);
});

test("pauses and resumes without losing the current position", async () => {
  let resolve_first;
  const first_finished = new Promise((resolve) => {
    resolve_first = resolve;
  });
  const order = [];
  const registry = new AutomationOperationRegistry()
    .register({
      name: "first",
      run: async () => {
        order.push("first");
        await first_finished;
      },
    })
    .register({
      name: "second",
      run: async () => order.push("second"),
    });
  const engine = new AutomationEngine(
    { tasks: [{ operations: ["first", "second"] }] },
    registry,
  );
  const running = engine.start();
  await delay(0);
  assert.equal(engine.pause().state, "paused");
  resolve_first();
  await delay(0);
  assert.deepEqual(order, ["first"]);
  assert.equal(engine.get_state().state, "paused");
  await engine.resume();
  await running;
  assert.deepEqual(order, ["first", "second"]);
  assert.equal(engine.get_state().state, "complete");
});

test("retries a failed operation up to its configured limit", async () => {
  let attempts = 0;
  const retries = [];
  const registry = new AutomationOperationRegistry().register({
    name: "flaky",
    max_retries: 2,
    run: async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("temporary failure");
      return { value: "ok" };
    },
  });
  const engine = new AutomationEngine(
    { tasks: [{ operations: ["flaky"] }] },
    registry,
    {
      on_operation_retry: (_, error, count) =>
        retries.push([error.message, count]),
    },
  );

  const state = await engine.start();

  assert.equal(state.state, "complete");
  assert.equal(attempts, 3);
  assert.deepEqual(retries, [
    ["temporary failure", 1],
    ["temporary failure", 2],
  ]);
});

test("cancellation stops later operations and exposes an aborted signal", async () => {
  let signal;
  let later_operation_started = false;
  const registry = new AutomationOperationRegistry()
    .register({
      name: "slow",
      run: async (context) => {
        signal = context.signal;
        await delay(5);
      },
    })
    .register({
      name: "later",
      run: async () => {
        later_operation_started = true;
      },
    });
  const engine = new AutomationEngine(
    { tasks: [{ operations: ["slow", "later"] }] },
    registry,
  );
  const running = engine.start();
  await delay(0);
  engine.cancel();
  const state = await running;

  assert.equal(state.state, AUTOMATION_ENGINE_CANCELLED);
  assert.equal(signal.aborted, true);
  assert.equal(later_operation_started, false);
});

test("restores a checkpoint as paused and resumes at the saved operation", async () => {
  let checkpoint;
  const registry = new AutomationOperationRegistry()
    .register({ name: "first", run: async () => ({}) })
    .register({ name: "second", run: async () => ({}) });
  const job = {
    id: 42,
    automation_type: "tiles",
    tasks: [{ operations: ["first", "second"] }],
  };
  const original = new AutomationEngine(job, registry, {
    on_checkpoint: (value) => {
      if (!checkpoint) checkpoint = value;
    },
  });
  await original.start();

  const restored = new AutomationEngine(job, registry);
  assert.equal(restored.restore_checkpoint(checkpoint).state, "paused");
  assert.equal((await restored.resume()).state, "complete");
});

test("normalizes persisted Tiles tasks and dispatches their operation", async () => {
  const job = normalize_tiles_automation_job({
    id: 12,
    automation_type: "tiles",
    tasks: [
      {
        generate_code: "redo",
        level: 8,
        short_codes: ["0210302.gz"],
      },
    ],
  });
  const executed = [];
  const registry = create_tiles_operation_registry(
    async (context) => {
      executed.push(context.task.data);
      return { value: "tile task complete" };
    },
    { countdown_seconds: 0 },
  );
  assert.equal(registry.has("common_countdown"), true);
  assert.equal(registry.has("countdown"), false);
  const engine = new AutomationEngine(job, registry);

  const state = await engine.start();

  assert.equal(state.state, "complete");
  assert.equal(job.tasks[0].operations[2], "tiles_redo");
  assert.deepEqual(executed, [job.tasks[0].data]);
});

test("waits for each Tiles task executor before advancing", async () => {
  let release_first;
  const first_task_done = new Promise((resolve) => {
    release_first = resolve;
  });
  const started = [];
  const registry = create_tiles_operation_registry(
    async ({ task }) => {
      started.push(task.data.level);
      if (task.data.level === 1) {
        await first_task_done;
      }
      return { complete: true };
    },
    { countdown_seconds: 0 },
  );
  const job = normalize_tiles_automation_job({
    id: 13,
    automation_type: "tiles",
    tasks: [
      { generate_code: "redo", level: 1, short_codes: ["0.gz"] },
      { generate_code: "blank", level: 2, short_codes: ["1.gz"] },
    ],
  });
  const engine = new AutomationEngine(job, registry);
  const running = engine.start();
  await delay(0);
  assert.deepEqual(started, [1]);
  release_first();
  assert.equal((await running).state, "complete");
  assert.deepEqual(started, [1, 2]);
});
