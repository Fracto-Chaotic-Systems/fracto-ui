/**
 * Shared operation namespace for AutomationEngine registries.
 *
 * Common operations are registered into a caller-owned registry, but keep a
 * stable `common_` name prefix so they cannot collide with page-specific
 * operations. The library intentionally contains no React or page imports.
 */
export const COMMON_AUTOMATION_OPERATION_PREFIX = "common_";
export const COMMON_AUTOMATION_OPERATION_COUNTDOWN = "countdown";

/**
 * Return the registry name for a shared operation.
 *
 * @param {string} name Unnamespaced operation name.
 * @returns {string} Namespaced operation name.
 */
export const common_automation_operation_name = (name) => {
  if (typeof name !== "string" || !name) {
    throw new Error("a common automation operation name is required");
  }
  if (name.startsWith(COMMON_AUTOMATION_OPERATION_PREFIX)) {
    throw new Error("common automation operation names must be unnamespaced");
  }
  return `${COMMON_AUTOMATION_OPERATION_PREFIX}${name}`;
};

/**
 * Create a reusable cancellable countdown operation.
 *
 * The returned definition uses the unnamespaced name `countdown`; callers
 * should register it through AutomationOperationLibrary.register(). During
 * execution, progress is normalized to 0-1 and the remaining whole seconds
 * are supplied as the operation detail value.
 *
 * @param {Object} [options={}] Countdown configuration.
 * @param {number} [options.duration_seconds=3] Number of seconds to count.
 * @param {number} [options.interval_ms=1000] Interval between countdown steps.
 * @returns {Object} AutomationOperationDefinition.
 */
export const create_countdown_operation = ({
  duration_seconds = 3,
  interval_ms = 1000,
} = {}) => {
  const numeric_seconds = Number(duration_seconds);
  const numeric_interval = Number(interval_ms);
  const seconds = Number.isFinite(numeric_seconds)
    ? Math.max(0, Math.floor(numeric_seconds))
    : 0;
  const interval = Number.isFinite(numeric_interval)
    ? Math.max(1, Math.floor(numeric_interval))
    : 1000;
  return {
    name: COMMON_AUTOMATION_OPERATION_COUNTDOWN,
    run: async ({ report_progress, signal } = {}) => {
      for (let remaining = seconds; remaining > 0; remaining -= 1) {
        if (signal?.aborted) {
          throw new Error("automation countdown cancelled");
        }
        report_progress((seconds - remaining) / seconds, remaining);
        if (!signal) {
          await new Promise((resolve) => setTimeout(resolve, interval));
          continue;
        }
        await new Promise((resolve, reject) => {
          let on_abort;
          const timer = setTimeout(() => {
            signal.removeEventListener("abort", on_abort);
            resolve();
          }, interval);
          on_abort = () => {
            clearTimeout(timer);
            signal.removeEventListener("abort", on_abort);
            reject(new Error("automation countdown cancelled"));
          };
          signal.addEventListener("abort", on_abort, { once: true });
        });
      }
      report_progress(1, null);
      return {};
    },
  };
};

/**
 * Shared operation registration helpers.
 *
 * Future reusable operations should be exposed as factory methods here. Each
 * factory should return an AutomationOperationDefinition and leave execution
 * state ownership to AutomationEngine.
 */
export class AutomationOperationLibrary {
  /**
   * Register a common operation under the shared namespace.
   *
   * @param {Object} registry AutomationOperationRegistry instance.
   * @param {Object} definition Operation definition with an unnamespaced name.
   * @returns {Object} The supplied registry for composition.
   */
  static register = (registry, definition) => {
    if (!registry || typeof registry.register !== "function") {
      throw new Error("an automation operation registry is required");
    }
    if (
      !definition ||
      typeof definition.name !== "string" ||
      !definition.name
    ) {
      throw new Error("a common automation operation name is required");
    }
    if (typeof definition.run !== "function") {
      throw new Error(
        `common automation operation ${definition.name} must define run()`,
      );
    }
    return registry.register({
      ...definition,
      name: common_automation_operation_name(definition.name),
    });
  };
}
