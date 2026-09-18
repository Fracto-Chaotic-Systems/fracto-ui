/**
 * Shared contracts for page-level automation.
 *
 * This module intentionally contains no page-specific imports or operation
 * implementations. Tiles, Assets, and future callers provide their own task
 * data and operation registries to the engine built on these contracts.
 */

/** States of the overall automation job. */
export const AUTOMATION_ENGINE_IDLE = "idle";
export const AUTOMATION_ENGINE_RUNNING = "running";
export const AUTOMATION_ENGINE_PAUSED = "paused";
export const AUTOMATION_ENGINE_COMPLETE = "complete";
export const AUTOMATION_ENGINE_FAILED = "failed";
export const AUTOMATION_ENGINE_CANCELLED = "cancelled";
export const AUTOMATION_CHECKPOINT_VERSION = 1;

/** State of an individual operation. */
export const AUTOMATION_OPERATION_PENDING = "pending";
export const AUTOMATION_OPERATION_RUNNING = "running";
export const AUTOMATION_OPERATION_COMPLETE = "complete";
export const AUTOMATION_OPERATION_FAILED = "failed";

/**
 * Registry for caller-provided automation operations.
 *
 * The registry is deliberately limited to registration and lookup. Execution
 * order and lifecycle management belong to AutomationEngine itself.
 */
export class AutomationOperationRegistry {
  constructor() {
    /** @type {Map<string, AutomationOperationDefinition>} */
    this.operations = new Map();
  }

  /**
   * Register one operation definition.
   *
   * @param {AutomationOperationDefinition} definition Operation to register.
   * @returns {AutomationOperationRegistry} This registry for composition.
   */
  register = (definition) => {
    if (!definition || typeof definition.name !== "string" || !definition.name) {
      throw new Error("automation operation name is required");
    }
    if (typeof definition.run !== "function") {
      throw new Error(`automation operation ${definition.name} must define run()`);
    }
    if (this.operations.has(definition.name)) {
      throw new Error(`automation operation ${definition.name} is already registered`);
    }
    this.operations.set(definition.name, definition);
    return this;
  };

  /**
   * Retrieve a registered operation.
   *
   * @param {string} name Operation identifier.
   * @returns {AutomationOperationDefinition|undefined} Registered operation.
   */
  get = (name) => this.operations.get(name);

  /**
   * Test whether an operation is registered.
   *
   * @param {string} name Operation identifier.
   * @returns {boolean} Whether the operation exists.
   */
  has = (name) => this.operations.has(name);

  /**
   * Return registered operation names in registration order.
   *
   * @returns {string[]} Operation identifiers.
   */
  names = () => [...this.operations.keys()];
}

/**
 * @typedef {Object} AutomationOperationDefinition
 * @property {string} name Stable operation identifier.
 * @property {(context: AutomationOperationContext) => Promise<AutomationOperationResult>} run
 * Async operation implementation supplied by the caller.
 * @property {number} [max_retries=0] Number of retries after the first failure.
 * @property {number} [retry_delay_ms=0] Delay between retry attempts.
 */

/**
 * @typedef {Object} AutomationOperationContext
 * @property {Object} job Complete automation job being executed.
 * @property {Object} task Current task being executed.
 * @property {number} task_index Zero-based task position.
 * @property {number} operation_index Zero-based operation position.
 * @property {number} operation_attempt One-based attempt number.
 * @property {Object} runtime Mutable caller-owned runtime context.
 * @property {AbortSignal} [signal] Optional cancellation signal.
 * @property {(progress: number, detail?: *) => AutomationEngineState} report_progress
 * Report progress and optional operation detail for the current operation.
 */

/**
 * @typedef {Object} AutomationOperationResult
 * @property {boolean} [complete] Whether the operation completed successfully.
 * @property {*} [value] Optional operation-specific result value.
 * @property {Object} [metadata] Optional diagnostic metadata.
 */

/**
 * @typedef {Object} AutomationTask
 * @property {string} [id] Optional task identifier.
 * @property {string[]} [operations] Ordered operation names for the task.
 * @property {*} [data] Caller-owned task data consumed by operations.
 */

/**
 * @typedef {Object} AutomationJob
 * @property {string|number} [id] Optional persistent job identifier.
 * @property {string} [automation_type] Caller namespace for the job.
 * @property {string} [state] Persistent job state.
 * @property {AutomationTask[]} tasks Ordered tasks to execute.
 */

/**
 * @typedef {Object} AutomationEngineState
 * @property {string} state Overall engine state.
 * @property {number} task_index Current task index, or -1 before starting.
 * @property {number} operation_index Current operation index, or -1 before starting.
 * @property {string|null} current_operation Current operation name, if any.
 * @property {*} error Last execution error, if the engine failed.
 * @property {*} result Last completion result, if available.
 * @property {number} operation_progress Progress of the current operation, 0-1.
 * @property {*} operation_detail Optional operation-specific display detail.
 * @property {number} operations_completed Number of completed operations.
 * @property {number} operations_total Total operations in the job.
 * @property {number} progress Overall job progress, 0-1.
 */

/**
 * @typedef {Object} AutomationEngineCallbacks
 * @property {(state: AutomationEngineState) => void} [on_state_change]
 * @property {(context: AutomationOperationContext) => void} [on_job_started]
 * @property {(context: AutomationOperationContext) => void} [on_task_started]
 * @property {(context: AutomationOperationContext) => void} [on_operation_started]
 * @property {(context: AutomationOperationContext, result: AutomationOperationResult) => void} [on_operation_complete]
 * @property {(context: AutomationOperationContext, error: *, retry_count: number) => void} [on_operation_retry]
 * @property {(context: AutomationOperationContext) => void} [on_task_complete]
 * @property {(state: AutomationEngineState) => void} [on_paused]
 * @property {(state: AutomationEngineState) => void} [on_resumed]
 * @property {(state: AutomationEngineState) => void} [on_complete]
 * @property {(state: AutomationEngineState) => void} [on_failed]
 * @property {(state: AutomationEngineState) => void} [on_cancelled]
 * @property {(state: AutomationEngineState, context: AutomationOperationContext) => void} [on_progress]
 * @property {(checkpoint: Object) => void} [on_checkpoint]
 * @property {(event: AutomationEngineEvent) => void} [on_event]
 */

/**
 * @typedef {Object} AutomationEngineEvent
 * @property {number} sequence Monotonically increasing event number.
 * @property {number} timestamp Unix timestamp in milliseconds.
 * @property {string} type Lifecycle event identifier.
 * @property {AutomationEngineState} state State at event time.
 * @property {Object} details Event-specific diagnostic details.
 */

/**
 * Operation-agnostic automation execution engine.
 *
 * The engine owns ordering and lifecycle state, while callers provide the
 * operation implementations through AutomationOperationRegistry. It awaits
 * each operation before advancing, so one task cannot overlap another task
 * or operation in the same job.
 */
export class AutomationEngine {
  /**
   * @param {AutomationJob} job Job to execute.
   * @param {AutomationOperationRegistry} registry Operation definitions.
   * @param {AutomationEngineCallbacks} [callbacks] Lifecycle callbacks.
   * @param {Object} [runtime={}] Caller-owned runtime context.
   */
  constructor(job, registry, callbacks = {}, runtime = {}) {
    if (!job || !Array.isArray(job.tasks)) {
      throw new Error("automation job must provide a tasks array");
    }
    if (!(registry instanceof AutomationOperationRegistry)) {
      throw new Error("automation operation registry is required");
    }
    this.job = job;
    this.registry = registry;
    this.callbacks = callbacks;
    this.runtime = runtime;
    this.started_task_index = -1;
    this.runner_active = false;
    this.cancel_requested = false;
    this.cancel_notified = false;
    this.abort_controller = new AbortController();
    this.events = [];
    this.event_sequence = 0;
    this.operations_total = job.tasks.reduce(
      (total, task) => total + (task.operations || []).length,
      0,
    );
    this.state = {
      state: AUTOMATION_ENGINE_IDLE,
      task_index: -1,
      operation_index: -1,
      operation_attempt: 0,
      current_operation: null,
      error: null,
      result: null,
      operation_progress: 0,
      operation_detail: null,
      operations_completed: 0,
      operations_total: this.operations_total,
      progress: this.operations_total ? 0 : 1,
    };
  }

  /** @returns {AutomationEngineState} A snapshot of current engine state. */
  get_state = () => ({ ...this.state });

  /** @returns {AutomationTask|null} Current task, if execution has started. */
  get_current_task = () => {
    const { task_index } = this.state;
    return task_index >= 0 ? this.job.tasks[task_index] || null : null;
  };

  /** @returns {AutomationOperationDefinition|null} Current operation definition. */
  get_current_operation = () => {
    const task = this.get_current_task();
    const operation_name = task?.operations?.[this.state.operation_index];
    return operation_name ? this.registry.get(operation_name) || null : null;
  };

  /**
   * Start execution and resolve when the runner pauses or reaches a terminal
   * state. A later resume() call continues the same engine instance.
   */
  start = async () => {
    if (this.state.state !== AUTOMATION_ENGINE_IDLE) {
      return this.get_state();
    }
    this.set_state({
      state: AUTOMATION_ENGINE_RUNNING,
      task_index: this.job.tasks.length ? 0 : -1,
      operation_index: this.job.tasks.length ? 0 : -1,
    });
    this.callbacks.on_job_started?.(this.get_context());
    this.record_event("job_started");
    if (!this.job.tasks.length) {
      this.complete_job();
      return this.get_state();
    }
    await this.run_operations();
    return this.get_state();
  };

  /**
   * Execute operations in task order, awaiting each result before advancing.
   * The loop naturally yields when pause() changes the engine state.
   */
  run_operations = async () => {
    if (this.runner_active) {
      return;
    }
    this.runner_active = true;
    try {
      while (this.state.state === AUTOMATION_ENGINE_RUNNING) {
        const task = this.get_current_task();
        if (!task) {
          this.complete_job();
          return;
        }
        if (this.started_task_index !== this.state.task_index) {
          this.started_task_index = this.state.task_index;
          this.callbacks.on_task_started?.(this.get_context());
          this.record_event("task_started");
        }
        const operations = task.operations || [];
        if (this.state.operation_index >= operations.length) {
          this.callbacks.on_task_complete?.(this.get_context());
          this.record_event("task_complete");
          if (this.state.task_index >= this.job.tasks.length - 1) {
            this.complete_job();
            return;
          }
          this.set_state({
            task_index: this.state.task_index + 1,
            operation_index: 0,
            operation_attempt: 0,
            current_operation: null,
            operation_detail: null,
          });
          continue;
        }
        await this.run_current_operation();
      }
    } finally {
      this.runner_active = false;
    }
  };

  /**
   * Pause progression after the current operation settles.
   *
   * An operation already in flight is not cancelled. Its result is recorded,
   * then the engine remains paused before beginning the next operation.
   *
   * @returns {AutomationEngineState} Updated engine state.
   */
  pause = () => {
    if (this.state.state !== AUTOMATION_ENGINE_RUNNING) {
      return this.get_state();
    }
    this.set_state({ state: AUTOMATION_ENGINE_PAUSED });
    this.callbacks.on_paused?.(this.get_state());
    this.record_event("paused");
    return this.get_state();
  };

  /**
   * Resume a paused job from its current task and operation.
   *
   * @returns {Promise<AutomationEngineState>} State after the runner settles,
   * or the current state when the engine was not paused.
   */
  resume = async () => {
    if (this.state.state !== AUTOMATION_ENGINE_PAUSED) {
      return this.get_state();
    }
    this.set_state({ state: AUTOMATION_ENGINE_RUNNING });
    this.callbacks.on_resumed?.(this.get_state());
    this.record_event("resumed");
    await this.run_operations();
    return this.get_state();
  };

  /**
   * Request cooperative cancellation of the job.
   *
   * Operations receive the AbortSignal through their context and may stop
   * early. An operation that does not observe the signal is allowed to finish,
   * but no later operation will be started.
   *
   * @returns {AutomationEngineState} Updated engine state.
   */
  cancel = () => {
    if (
      ![
        AUTOMATION_ENGINE_RUNNING,
        AUTOMATION_ENGINE_PAUSED,
      ].includes(this.state.state)
    ) {
      return this.get_state();
    }
    this.cancel_requested = true;
    this.abort_controller.abort();
    this.cancel_job();
    return this.get_state();
  };

  /** Execute the current operation and advance only after it resolves. */
  run_current_operation = async () => {
    const task = this.get_current_task();
    const operation_name = task?.operations?.[this.state.operation_index];
    const operation = this.get_current_operation();
    if (!operation || !operation_name) {
      this.fail(new Error(`automation operation ${operation_name || ""} is not registered`));
      return;
    }
    const max_retries = Math.floor(
      Math.max(0, Number(operation.max_retries) || 0),
    );
    const retry_delay_ms = Math.floor(
      Math.max(0, Number(operation.retry_delay_ms) || 0),
    );
    let retry_count = 0;
    while (!this.cancel_requested) {
      this.set_state({
        current_operation: operation_name,
        operation_attempt: retry_count + 1,
        operation_progress: 0,
        operation_detail: null,
      });
      const context = this.get_context();
      this.callbacks.on_operation_started?.(context);
      this.record_event("operation_started");
      try {
        const result = (await operation.run(context)) || {};
        if (this.cancel_requested) {
          this.set_state({
            result,
            current_operation: null,
            operation_detail: null,
          });
          return;
        }
        this.set_state({ result });
        this.callbacks.on_operation_complete?.(this.get_context(), result);
        this.set_state({
          operation_index: this.state.operation_index + 1,
          operation_attempt: 0,
          current_operation: null,
          operation_progress: 0,
          operation_detail: null,
          operations_completed: this.state.operations_completed + 1,
          progress: this.get_progress_for_completed_operation(
            0,
            this.state.operations_completed + 1,
          ),
        });
        this.record_event("operation_complete", { result });
        this.callbacks.on_checkpoint?.(this.get_checkpoint());
        return;
      } catch (error) {
        if (this.cancel_requested) {
          this.cancel_job();
          return;
        }
        if (retry_count >= max_retries) {
          this.fail(error);
          return;
        }
        retry_count += 1;
        this.callbacks.on_operation_retry?.(
          this.get_context(),
          error,
          retry_count,
        );
        this.record_event("operation_retry", {
          error,
          retry_count,
        });
        const can_retry = await this.wait_for_retry(retry_delay_ms);
        if (!can_retry) {
          this.cancel_job();
          return;
        }
      }
    }
    this.cancel_job();
  };

  /**
   * Wait between retry attempts, resolving false if cancellation occurs.
   *
   * @param {number} delay_ms Retry delay in milliseconds.
   * @returns {Promise<boolean>} Whether another attempt may begin.
   */
  wait_for_retry = (delay_ms) => {
    if (!delay_ms) {
      return Promise.resolve(!this.cancel_requested);
    }
    return new Promise((resolve) => {
      let on_abort;
      const timer = setTimeout(() => {
        this.abort_controller.signal.removeEventListener("abort", on_abort);
        resolve(!this.cancel_requested);
      }, delay_ms);
      on_abort = () => {
        clearTimeout(timer);
        this.abort_controller.signal.removeEventListener("abort", on_abort);
        resolve(false);
      };
      this.abort_controller.signal.addEventListener("abort", on_abort, {
        once: true,
      });
    });
  };

  /** @returns {AutomationOperationContext} Current operation context. */
  get_context = () => ({
    job: this.job,
    task: this.get_current_task(),
    task_index: this.state.task_index,
    operation_index: this.state.operation_index,
    runtime: this.runtime,
    signal: this.abort_controller.signal,
    report_progress: this.report_operation_progress,
  });

  /**
   * Report progress for the currently running operation.
   *
   * @param {number} progress Operation progress between 0 and 1.
   * @param {*} [detail] Optional operation-specific display detail.
   * @returns {AutomationEngineState} Updated engine state.
   */
  report_operation_progress = (progress, detail = null) => {
    if (
      this.state.state !== AUTOMATION_ENGINE_RUNNING ||
      !this.state.current_operation
    ) {
      return this.get_state();
    }
    const operation_progress = Math.max(0, Math.min(1, Number(progress) || 0));
    this.set_state({
      operation_progress,
      operation_detail: detail,
      progress: this.get_progress_for_completed_operation(operation_progress),
    });
    this.callbacks.on_progress?.(this.get_state(), this.get_context());
    return this.get_state();
  };

  /**
   * Calculate overall progress from completed and current operation work.
   *
   * @param {number} [operation_progress] Current operation progress, 0-1.
   * @param {number} [operations_completed] Completed operation count.
   * @returns {number} Overall progress, 0-1.
   */
  get_progress_for_completed_operation = (
    operation_progress = 0,
    operations_completed = this.state.operations_completed,
  ) => {
    if (!this.operations_total) {
      return 1;
    }
    return Math.min(
      1,
      (operations_completed + operation_progress) / this.operations_total,
    );
  };

  /**
   * Return a versioned, persistence-safe execution checkpoint.
   *
   * Checkpoints are intended to be created at operation boundaries. They do
   * not contain the registry or caller runtime, which must be reconstructed
   * by the caller before restoring.
   *
   * @returns {Object} Serializable engine checkpoint.
   */
  get_checkpoint = () => ({
    version: AUTOMATION_CHECKPOINT_VERSION,
    job_id: this.job.id ?? null,
    automation_type: this.job.automation_type ?? null,
    state: this.state.state,
    task_index: this.state.task_index,
    operation_index: this.state.operation_index,
    operations_completed: this.state.operations_completed,
    progress: this.state.progress,
  });

  /**
   * Restore a checkpoint before starting or resuming the engine.
   *
   * A checkpoint captured while running is restored as paused because an
   * in-flight operation cannot safely be reconstructed after a restart.
   *
   * @param {Object} checkpoint Persisted checkpoint.
   * @returns {AutomationEngineState} Restored engine state.
   */
  restore_checkpoint = (checkpoint) => {
    if (this.state.state !== AUTOMATION_ENGINE_IDLE) {
      throw new Error("automation checkpoint can only be restored while idle");
    }
    if (!checkpoint || checkpoint.version !== AUTOMATION_CHECKPOINT_VERSION) {
      throw new Error("unsupported automation checkpoint version");
    }
    if (
      checkpoint.job_id != null &&
      this.job.id != null &&
      checkpoint.job_id !== this.job.id
    ) {
      throw new Error("automation checkpoint belongs to a different job");
    }
    if (
      checkpoint.automation_type != null &&
      this.job.automation_type != null &&
      checkpoint.automation_type !== this.job.automation_type
    ) {
      throw new Error("automation checkpoint belongs to a different type");
    }
    if (
      !Number.isInteger(checkpoint.task_index) ||
      checkpoint.task_index < -1 ||
      checkpoint.task_index >= this.job.tasks.length
    ) {
      throw new Error("automation checkpoint task index is invalid");
    }
    const task = this.job.tasks[checkpoint.task_index];
    const operation_count = task?.operations?.length || 0;
    if (
      !Number.isInteger(checkpoint.operation_index) ||
      checkpoint.operation_index < -1 ||
      (!task && checkpoint.operation_index !== -1) ||
      (task && checkpoint.operation_index > operation_count)
    ) {
      throw new Error("automation checkpoint operation index is invalid");
    }
    this.set_state({
      state:
        checkpoint.state === AUTOMATION_ENGINE_COMPLETE
          ? AUTOMATION_ENGINE_COMPLETE
          : AUTOMATION_ENGINE_PAUSED,
      task_index: checkpoint.task_index,
      operation_index: checkpoint.operation_index,
      operations_completed: Math.max(
        0,
        Math.min(this.operations_total, checkpoint.operations_completed || 0),
      ),
      progress: Math.max(0, Math.min(1, checkpoint.progress || 0)),
      operation_attempt: 0,
      current_operation: null,
    });
    this.started_task_index = this.state.task_index - 1;
    return this.get_state();
  };

  /** @param {Partial<AutomationEngineState>} changes State changes to apply. */
  set_state = (changes) => {
    this.state = { ...this.state, ...changes };
    this.callbacks.on_state_change?.(this.get_state());
  };

  /**
   * Record a structured lifecycle event and retain a bounded history.
   *
   * @param {string} type Event identifier.
   * @param {Object} [details={}] Event-specific details.
   * @returns {AutomationEngineEvent} Recorded event.
   */
  record_event = (type, details = {}) => {
    const event = {
      sequence: ++this.event_sequence,
      timestamp: Date.now(),
      type,
      state: this.get_state(),
      details,
    };
    this.events.push(event);
    if (this.events.length > 1000) {
      this.events.shift();
    }
    this.callbacks.on_event?.(event);
    return event;
  };

  /** @returns {AutomationEngineEvent[]} A copy of the event history. */
  get_events = () => [...this.events];

  /** Clear the in-memory event history without changing execution state. */
  clear_events = () => {
    this.events = [];
  };

  /** Mark the job complete and notify the caller. */
  complete_job = () => {
    this.set_state({
      state: AUTOMATION_ENGINE_COMPLETE,
      current_operation: null,
      operation_progress: 0,
      operation_detail: null,
      operations_completed: this.operations_total,
      progress: 1,
    });
    this.callbacks.on_complete?.(this.get_state());
    this.record_event("complete");
  };

  /** Mark the job cancelled and notify the caller once. */
  cancel_job = () => {
    if (this.cancel_notified) {
      return;
    }
    this.cancel_notified = true;
    this.set_state({
      state: AUTOMATION_ENGINE_CANCELLED,
      current_operation: null,
    });
    this.callbacks.on_cancelled?.(this.get_state());
    this.record_event("cancelled");
  };

  /** @param {*} error Mark the job failed and notify the caller. */
  fail = (error) => {
    this.set_state({
      state: AUTOMATION_ENGINE_FAILED,
      error,
      current_operation: null,
    });
    this.callbacks.on_failed?.(this.get_state());
    this.record_event("failed", { error });
  };
}
