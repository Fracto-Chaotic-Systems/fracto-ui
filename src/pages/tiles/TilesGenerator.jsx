import React, { Component, createRef } from "react";

import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppText from "../../AppText.jsx";
import { KEY_TILES_GENERATE } from "../../text/TilesText.jsx";
import PageAutomation, {
  PAGE_MODE_AUTOMATION,
  PAGE_MODE_MANAGER,
  PAGE_MODE_OPERATOR,
} from "../utils/PageAutomation.jsx";

import { INCLUDE_CAN_DO } from "../../utils/render/FractoTileCoverage.jsx";
import { TILE_GENERATOR_SPLITTER_KEYS } from "../../navigator/NavigatorKeys.jsx";

import NavigatorCoverage from "../../navigator/NavigatorCoverage.jsx";
import GeneratorControl, {
  GENERATOR_CODE_BLANK,
  GENERATOR_CODE_CAN_DO,
  GENERATOR_CODE_INTERIOR,
  GENERATOR_CODE_REDO,
} from "./generator/GeneratorControl.jsx";
import GeneratorOperations from "./generator/GeneratorOperations.jsx";
import { get_visible_coverage_levels } from "../assets/AssetsUtils.jsx";
import TilesBackend from "../../backend/TilesBackend.jsx";
import AppSettings from "../../AppSettings.jsx";
import { KEY_TILES_GENERATOR_FRAME_SETTINGS } from "../../settings/TilesSettings.jsx";
import {
  AutomationEngine,
  AUTOMATION_ENGINE_IDLE,
  AUTOMATION_ENGINE_PAUSED,
  AUTOMATION_ENGINE_RUNNING,
} from "../utils/AutomationEngine.jsx";
import {
  create_tiles_operation_registry,
  normalize_tiles_automation_job,
} from "./generator/TilesAutomationOperations.jsx";

/**
 * The operation names persisted in a manager task are intentionally aligned
 * with the coverage table identifiers. The tile-count action is represented
 * as `redo` because it reprocesses existing tiles.
 */
export const AUTOMATION_TASK_CODES = {
  [GENERATOR_CODE_REDO]: "redo",
  [GENERATOR_CODE_CAN_DO]: "can_do",
  [GENERATOR_CODE_BLANK]: "blank",
  [GENERATOR_CODE_INTERIOR]: "interior",
};
const AUTOMATION_TASK_WARNING_INTERVAL = 10000;
const AUTOMATION_FRAME_SETTINGS_TIMEOUT_MS = 30000;

/** Return a UTC timestamp in the format accepted by MySQL DATETIME. */
const mysql_datetime_now = () =>
  new Date().toISOString().slice(0, 19).replace("T", " ");

/**
 * @typedef {Object} AutomationTask
 * @property {string} generate_code Coverage operation: redo, can_do, blank,
 * or interior.
 * @property {number} level Tile level targeted by the operation.
 * @property {string[]} short_codes Ordered shortcodes included in the task.
 * @property {{x: number, y: number}} focal_point Frame location captured
 * when the task was created.
 * @property {number} scope Frame scope captured when the task was created.
 */

/**
 * Creates the normalized task shape used by manager mode.
 *
 * @param {string} generate_code Internal coverage operation code.
 * @param {number} level Tile level targeted by the operation.
 * @param {string[]} short_codes Shortcodes included in the task.
 * @param {Object} [frame_settings] Frame settings to capture for this task.
 * @returns {AutomationTask} Normalized manager task.
 */
export const create_automation_task = (
  generate_code,
  level,
  short_codes,
  frame_settings = {},
) => ({
  generate_code: AUTOMATION_TASK_CODES[generate_code] || generate_code,
  level,
  short_codes: [...short_codes],
  ...(frame_settings.focal_point
    ? { focal_point: { ...frame_settings.focal_point } }
    : {}),
  ...(frame_settings.scope !== undefined
    ? { scope: frame_settings.scope }
    : {}),
});

export class TilesGenerator extends Component {
  /** Engine instance is created once the automation operation registry exists. */
  automation_engine = null;
  operations_ref = createRef();
  automation_persistence_chain = Promise.resolve();

  state = {
    coverage_data: [],
    heat_map_buffer: [],
    selected_coverage_levels: [],
    short_codes: [],
    width_px: 0,
    height_px: 0,
    generate_level: 0,
    generate_code: "",
    // Manager tasks remain visible and editable in memory until an explicit
    // save/submit action is added; changing modes must not discard them.
    automation_tasks: [],
    automation_jobs: [],
    active_automation_job: null,
    automation_running: false,
    stop_after_current_job: false,
    automation_mode: PAGE_MODE_OPERATOR,
    automation_engine_state: null,
  };

  /**
   * Attach the page-owned automation engine and mirror its read-only state.
   *
   * The engine remains an imperative coordinator owned by this page. Child
   * components will receive only the mirrored state and explicit callbacks.
   *
   * @param {Object|null} engine AutomationEngine instance, when available.
   */
  set_automation_engine = (engine) => {
    this.automation_engine = engine;
    this.setState({
      automation_engine_state: engine ? engine.get_state() : null,
    });
  };

  /**
   * Mirror an engine state callback for presentation components.
   *
   * @param {Object} automation_engine_state Latest engine state snapshot.
   */
  on_automation_engine_state = (automation_engine_state) => {
    this.setState({
      automation_engine_state,
      automation_running:
        automation_engine_state?.state === AUTOMATION_ENGINE_RUNNING,
    });
  };

  /** Queue a database update so checkpoint writes remain ordered. */
  persist_automation_update = (updates) => {
    const job_id = this.state.active_automation_job?.id;
    if (!job_id) {
      return this.automation_persistence_chain;
    }
    this.automation_persistence_chain = this.automation_persistence_chain
      .then(() => TilesBackend.update_automation(job_id, updates))
      .catch((error) => {
        console.error("tiles automation state persistence failed", error);
      });
    return this.automation_persistence_chain;
  };

  /** Persist the latest operation-boundary checkpoint. */
  persist_automation_checkpoint = (checkpoint) => {
    return this.persist_automation_update({
      state: "running",
      checkpoint,
    });
  };

  /** Persist a terminal or paused engine state in the shared job record. */
  persist_automation_state = (automation_engine_state, state) => {
    this.on_automation_engine_state(automation_engine_state);
    return this.persist_automation_update({
      state,
      run_stop: state === "running" ? null : mysql_datetime_now(),
    });
  };

  /** Handle a completed job and decide whether the next ready job may run. */
  on_automation_engine_complete = (automation_engine_state) => {
    const persist = this.persist_automation_state(
      automation_engine_state,
      "complete",
    );
    persist.then(() => {
      const continue_automation =
        !this.state.stop_after_current_job &&
        this.state.automation_mode === PAGE_MODE_AUTOMATION;
      this.automation_engine = null;
      this.setState(
        {
          active_automation_job: null,
          automation_engine_state: null,
          automation_running: false,
        },
        () => {
          if (continue_automation) {
            this.on_automation_running_change(true);
          }
        },
      );
    });
  };

  /** Create an engine for a claimed Tiles job and attach its task executor. */
  create_automation_engine = (job) => {
    const normalized_job = normalize_tiles_automation_job(job);
    const registry = create_tiles_operation_registry(
      (context) => {
        const operations = this.operations_ref.current;
        if (!operations) {
          return Promise.reject(
            new Error("Tiles operations are not mounted for automation"),
          );
        }
        return operations.execute_automation_task(context.task);
      },
      { prepare_frame: this.prepare_automation_frame },
    );
    const engine = new AutomationEngine(
      normalized_job,
      registry,
      {
        on_state_change: this.on_automation_engine_state,
        on_progress: this.on_automation_engine_state,
        on_checkpoint: this.persist_automation_checkpoint,
        on_paused: (state) => this.persist_automation_state(state, "paused"),
        on_resumed: (state) => this.persist_automation_state(state, "running"),
        on_complete: this.on_automation_engine_complete,
        on_failed: (state) => this.persist_automation_state(state, "failed"),
        on_cancelled: (state) => this.persist_automation_state(state, "paused"),
      },
      { page: "tiles_generator" },
    );
    this.set_automation_engine(engine);
    return engine;
  };

  /**
   * Wait for the Navigator's subscribed frame-settings value to match a task.
   *
   * @param {string} settings_key Navigator frame-settings AppSettings key.
   * @param {Object} expected_settings Focal point and scope to verify.
   * @returns {Promise<Object>} Published Navigator frame settings.
   */
  wait_for_navigator_frame_settings = (settings_key, expected_settings) => {
    const expected_focal_point = expected_settings.focal_point || {};
    const is_matching_render = (value) => {
      const focal_point = value?.focal_point || {};
      const render_complete = value?.render_complete;
      return (
        focal_point.x === expected_focal_point.x &&
        focal_point.y === expected_focal_point.y &&
        value?.scope === expected_settings.scope &&
        render_complete?.focal_point?.x === expected_focal_point.x &&
        render_complete?.focal_point?.y === expected_focal_point.y &&
        render_complete.scope === expected_settings.scope
      );
    };
    const current_settings = AppSettings.get(settings_key);
    if (is_matching_render(current_settings)) {
      return Promise.resolve(current_settings);
    }
    return new Promise((resolve, reject) => {
      let subscription_key;
      const timeout = setTimeout(() => {
        if (subscription_key) {
          AppSettings.unsubscribe(subscription_key);
        }
        reject(new Error("Navigator frame settings update timed out"));
      }, AUTOMATION_FRAME_SETTINGS_TIMEOUT_MS);
      const on_settings_changed = (key, value) => {
        if (key === settings_key && is_matching_render(value)) {
          clearTimeout(timeout);
          AppSettings.unsubscribe(subscription_key);
          resolve(value);
        }
      };
      subscription_key = AppSettings.subscribe(
        settings_key,
        on_settings_changed,
      );
      AppSettings.on_settings_changed({
        [settings_key]: expected_settings,
      });
    });
  };

  /** Apply a task's saved frame settings before its countdown begins. */
  prepare_automation_frame = async (context) => {
    const task_data = context.task?.data || context.task || {};
    // NavigatorCoverage subscribes to this exact key through its splitter
    // configuration. Updating it here moves the Navigator to the task's frame
    // before the shared countdown and tile operation begin.
    const navigator_frame_settings_key =
      TILE_GENERATOR_SPLITTER_KEYS.frame_settings_key;
    const current_settings = AppSettings.get(navigator_frame_settings_key);
    const next_settings = {
      ...current_settings,
      render_complete: null,
      ...(task_data.focal_point
        ? { focal_point: { ...task_data.focal_point } }
        : {}),
      ...(task_data.scope !== undefined ? { scope: task_data.scope } : {}),
    };
    const published_settings = await this.wait_for_navigator_frame_settings(
      navigator_frame_settings_key,
      next_settings,
    );
    return {
      focal_point: published_settings.focal_point,
      scope: published_settings.scope,
    };
  };

  /**
   * Central action boundary for automation controls.
   *
   * The engine-specific actions are threaded through now; step 7 will route
   * the controls to the actual engine methods once the instance is created.
   *
   * @param {string} action Requested engine action.
   */
  on_automation_engine_action = (action) => {
    const state = this.automation_engine?.get_state();
    if (action === "stop") {
      if (state?.state === AUTOMATION_ENGINE_RUNNING) {
        this.automation_engine.pause();
      } else {
        this.on_automation_running_change(false);
      }
      return;
    }
    if (action !== "start") {
      if (action === "cancel") {
        this.automation_engine?.cancel();
      }
      return;
    }
    if (state?.state === AUTOMATION_ENGINE_PAUSED) {
      this.automation_engine.resume();
      return;
    }
    if (state?.state === AUTOMATION_ENGINE_IDLE) {
      this.automation_engine.start();
      return;
    }
    this.on_automation_running_change(true);
  };

  componentDidMount() {
    if (this.state.automation_mode === PAGE_MODE_AUTOMATION) {
      this.refresh_automation_jobs();
    }
  }

  refresh_automation_jobs = async () => {
    try {
      const response = await TilesBackend.automation_jobs();
      const ready_jobs = (response.result || [])
        .filter((job) => job.state === "ready")
        .slice(0, 10);
      this.setState({ automation_jobs: ready_jobs });
    } catch (error) {
      console.error("tiles automation jobs load failed", error);
    }
  };

  claim_automation_job = async () => {
    try {
      const response = await TilesBackend.claim_automation_job();
      this.setState({ active_automation_job: response.job || null });
      await this.refresh_automation_jobs();
      return response.job || null;
    } catch (error) {
      console.error("tiles automation job claim failed", error);
      return null;
    }
  };

  on_coverage_data = (coverage_data, heat_map_buffer) => {
    // console.log('on_coverage_data', coverage_data)
    this.setState({
      coverage_data,
      heat_map_buffer,
      selected_coverage_levels: get_visible_coverage_levels(
        coverage_data,
        heat_map_buffer,
      ),
    });
  };

  on_coverage_levels_changed = (selected_coverage_levels) => {
    this.setState({ selected_coverage_levels });
  };

  /**
   * Appends one task to the manager-owned list while preserving insertion
   * order. Task persistence is intentionally deferred until a manager save
   * action is introduced.
   *
   * @param {AutomationTask} task Normalized task to append.
   */
  add_automation_task = (task) => {
    const current_short_code_count = this.state.automation_tasks.reduce(
      (count, existing_task) => count + existing_task.short_codes.length,
      0,
    );
    const next_short_code_count =
      current_short_code_count + task.short_codes.length;
    if (
      Math.floor(next_short_code_count / AUTOMATION_TASK_WARNING_INTERVAL) >
      Math.floor(current_short_code_count / AUTOMATION_TASK_WARNING_INTERVAL)
    ) {
      console.warn(
        `manager task list contains ${next_short_code_count} shortcodes; ` +
          "large task lists may increase persistence and processing time",
      );
    }
    this.setState((state) => ({
      automation_tasks: [...state.automation_tasks, task],
    }));
  };

  /** Persist the completed manager task list as a ready automation job. */
  save_automation_tasks = async () => {
    const { automation_tasks } = this.state;
    if (!automation_tasks.length) {
      return;
    }
    const frame_settings = AppSettings.get(KEY_TILES_GENERATOR_FRAME_SETTINGS);
    const tasks = automation_tasks.map((task) => ({
      ...task,
      // Preserve the frame captured when the manager selected this task.
      // The fallback keeps older in-memory tasks valid during this transition.
      focal_point: {
        ...(task.focal_point || frame_settings.focal_point),
      },
      scope: task.scope ?? frame_settings.scope,
    }));
    try {
      const result = await TilesBackend.create_automation({
        title: `tiles_${Date.now()}`,
        automation_type: "tiles",
        state: "ready",
        tasks,
      });
      console.log("tiles automation saved", result.id);
      this.setState({ automation_tasks: [] });
    } catch (error) {
      console.error("tiles automation save failed", error);
    }
  };

  on_generate = (tiles, level, generate_code) => {
    const short_codes = tiles.map((tile, i) => {
      return tile.short_code;
    });
    if (this.state.automation_mode === PAGE_MODE_MANAGER) {
      const frame_settings = AppSettings.get(
        KEY_TILES_GENERATOR_FRAME_SETTINGS,
      );
      this.add_automation_task(
        create_automation_task(
          generate_code,
          level,
          short_codes,
          frame_settings,
        ),
      );
      return;
    }
    if (this.state.automation_mode !== PAGE_MODE_OPERATOR) {
      console.warn(
        `ignoring ${generate_code} tile operation while in ${this.state.automation_mode} mode`,
      );
      return;
    }
    console.log(
      `on_generate ${generate_code}`,
      short_codes ? short_codes.length : 0,
    );
    this.setState({
      short_codes,
      generate_level: level,
      generate_code,
    });
  };

  control_block = () => {
    const { coverage_data, selected_coverage_levels } = this.state;
    return (
      <GeneratorControl
        automation_mode={this.state.automation_mode}
        automation_jobs={this.state.automation_jobs}
        automation_engine_state={this.state.automation_engine_state}
        on_automation_engine_action={this.on_automation_engine_action}
        automation_running={this.state.automation_running}
        stop_after_current_job={this.state.stop_after_current_job}
        automation_tasks={this.state.automation_tasks}
        coverage_data={coverage_data}
        heat_map_buffer={this.state.heat_map_buffer}
        selected_levels={selected_coverage_levels}
        on_coverage_levels_changed={this.on_coverage_levels_changed}
        on_generate={this.on_generate}
        on_save_automation_tasks={this.save_automation_tasks}
        on_automation_running_change={this.on_automation_running_change}
        on_stop_after_current_job_change={
          this.on_stop_after_current_job_change
        }
      />
    );
  };

  operations_block = () => {
    const { automation_mode, short_codes, generate_code } = this.state;
    if (automation_mode === PAGE_MODE_MANAGER) {
      return [];
    }
    // FractoTileCoverage clears coverage_data while a new heat map is being
    // fetched. Keep this component mounted during that transient state so an
    // active automation task does not reject as "unmounted".
    return (
      <GeneratorOperations
        ref={this.operations_ref}
        automation_mode={this.state.automation_mode}
        short_codes={automation_mode === PAGE_MODE_OPERATOR ? short_codes : []}
        generate_code={automation_mode === PAGE_MODE_OPERATOR ? generate_code : ""}
        automation_engine_state={this.state.automation_engine_state}
      />
    );
  };

  on_resize = (new_width_px, new_height_px) => {
    const { width_px, height_px } = this.state;
    if (new_width_px === width_px && new_height_px === height_px) {
      return;
    }
    this.setState({
      width_px: new_width_px,
      height_px: new_height_px,
    });
    console.log(`size is ${new_width_px}x${new_height_px}`);
  };

  on_automation_mode_change = (automation_mode) => {
    if (
      automation_mode !== PAGE_MODE_AUTOMATION &&
      this.automation_engine?.get_state().state === AUTOMATION_ENGINE_RUNNING
    ) {
      this.automation_engine.pause();
    }
    this.setState(
      {
        automation_mode,
        automation_running:
          automation_mode === PAGE_MODE_AUTOMATION
            ? this.state.automation_running
            : false,
      },
      () => {
        if (automation_mode === PAGE_MODE_AUTOMATION) {
          this.refresh_automation_jobs();
        }
      },
    );
  };

  on_automation_running_change = async (automation_running) => {
    if (!automation_running) {
      if (
        this.automation_engine?.get_state().state === AUTOMATION_ENGINE_RUNNING
      ) {
        this.automation_engine.pause();
      }
      this.setState({ automation_running: false });
      return;
    }
    if (!this.automation_engine) {
      const job =
        this.state.active_automation_job || (await this.claim_automation_job());
      if (!job) {
        console.warn("no ready Tiles automation job is available");
        return;
      }
      this.create_automation_engine(job);
    }
    if (this.automation_engine.get_state().state === AUTOMATION_ENGINE_IDLE) {
      await this.automation_engine.start();
    }
  };

  on_stop_after_current_job_change = (stop_after_current_job) => {
    this.setState({ stop_after_current_job });
  };

  render() {
    return [
      <styles.SectionTitle
        key={"tiles-overview-title"}
        style={{ position: "relative" }}
      >
        {AppText.get(KEY_TILES_GENERATE)}
        <PageAutomation
          automation_type="tiles_generator"
          on_mode_change={this.on_automation_mode_change}
        />
      </styles.SectionTitle>,
      <NavigatorCoverage
        splitter_keys={TILE_GENERATOR_SPLITTER_KEYS}
        control_block={this.control_block()}
        results_block={this.operations_block()}
        on_coverage_data={this.on_coverage_data}
        on_resize={this.on_resize}
        options={[INCLUDE_CAN_DO]}
        selected_levels={this.state.selected_coverage_levels}
      />,
    ];
  }
}

export default TilesGenerator;
