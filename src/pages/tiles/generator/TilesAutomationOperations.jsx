import { AutomationOperationRegistry } from "../../utils/AutomationEngine.jsx";
import {
  AutomationOperationLibrary,
  COMMON_AUTOMATION_OPERATION_COUNTDOWN,
  common_automation_operation_name,
  create_countdown_operation,
} from "../../utils/AutomationOperationLibrary.jsx";

/** Stable operation names used by the Tiles automation pipeline. */
export const TILES_AUTOMATION_OPERATIONS = {
  redo: "tiles_redo",
  can_do: "tiles_can_do",
  blank: "tiles_blank",
  interior: "tiles_interior",
};
export const TILES_AUTOMATION_PREPARE_FRAME = "tiles_prepare_frame";
export const TILES_AUTOMATION_COUNTDOWN = common_automation_operation_name(
  COMMON_AUTOMATION_OPERATION_COUNTDOWN,
);

/**
 * Convert a persisted coverage code to a stable engine operation name.
 *
 * Both persisted names (for example `redo`) and coverage names (for example
 * `tiles_redo`) are accepted so older jobs remain executable.
 *
 * @param {string} generate_code Persisted or UI coverage code.
 * @returns {string} Stable operation name.
 */
export const tiles_operation_name = (generate_code) => {
  const normalized_code = String(generate_code || "").replace(/^tiles_/, "");
  return (
    TILES_AUTOMATION_OPERATIONS[normalized_code] || `tiles_${normalized_code}`
  );
};

/**
 * Normalize one persisted Tiles task for AutomationEngine.
 *
 * @param {Object} task Persisted task with generate_code and tile data.
 * @param {number} task_index Position within its job.
 * @returns {Object} Engine task with one ordered operation.
 */
export const normalize_tiles_automation_task = (task, task_index = 0) => {
  if (!task || typeof task !== "object") {
    throw new Error("Tiles automation task must be an object");
  }
  const operation_name = tiles_operation_name(task.generate_code);
  return {
    id: task.id ?? `tiles-task-${task_index}`,
    operations: [
      TILES_AUTOMATION_PREPARE_FRAME,
      TILES_AUTOMATION_COUNTDOWN,
      operation_name,
    ],
    data: { ...task },
  };
};

/**
 * Normalize a persisted Tiles job for AutomationEngine.
 *
 * @param {Object} job Persisted automation job.
 * @returns {Object} Engine-compatible job.
 */
export const normalize_tiles_automation_job = (job) => {
  if (!job || !Array.isArray(job.tasks)) {
    throw new Error("Tiles automation job must provide a tasks array");
  }
  return {
    ...job,
    tasks: job.tasks.map(normalize_tiles_automation_task),
  };
};

/**
 * Create the operation registry for a Tiles page.
 *
 * The executor remains caller-owned because the page determines how a tile
 * task is started and how completion is detected.
 *
 * @param {(context: Object) => Promise<Object>|Object} execute_task Task
 * executor supplied by the Tiles page.
 * @returns {AutomationOperationRegistry} Registry of Tiles operations.
 */
export const create_tiles_operation_registry = (
  execute_task,
  { prepare_frame, countdown_seconds = 3 } = {},
) => {
  if (typeof execute_task !== "function") {
    throw new Error("Tiles automation task executor is required");
  }
  const registry = new AutomationOperationRegistry();
  Object.values(TILES_AUTOMATION_OPERATIONS).forEach((operation_name) => {
    registry.register({
      name: operation_name,
      run: (context) => execute_task(context),
    });
  });
  registry.register({
    name: TILES_AUTOMATION_PREPARE_FRAME,
    run: (context) => (prepare_frame ? prepare_frame(context) : {}),
  });
  AutomationOperationLibrary.register(
    registry,
    create_countdown_operation({ duration_seconds: countdown_seconds }),
  );
  return registry;
};
