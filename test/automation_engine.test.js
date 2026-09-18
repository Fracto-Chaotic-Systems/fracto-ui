import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const engine_source = await readFile(
  new URL("../src/pages/utils/AutomationEngine.jsx", import.meta.url),
  "utf8",
);
const {
  AutomationEngine,
  AutomationOperationRegistry,
  AUTOMATION_ENGINE_CANCELLED,
} = await import(`data:text/javascript,${encodeURIComponent(engine_source)}`);

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

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
    { on_operation_retry: (_, error, count) => retries.push([error.message, count]) },
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
  const job = { id: 42, automation_type: "tiles", tasks: [{ operations: ["first", "second"] }] };
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
