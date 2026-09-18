import React, { Component } from "react";

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

/**
 * @typedef {Object} AutomationTask
 * @property {string} generate_code Coverage operation: redo, can_do, blank,
 * or interior.
 * @property {number} level Tile level targeted by the operation.
 * @property {string[]} short_codes Ordered shortcodes included in the task.
 */

/**
 * Creates the normalized task shape used by manager mode.
 *
 * @param {string} generate_code Internal coverage operation code.
 * @param {number} level Tile level targeted by the operation.
 * @param {string[]} short_codes Shortcodes included in the task.
 * @returns {AutomationTask} Normalized manager task.
 */
export const create_automation_task = (generate_code, level, short_codes) => ({
  generate_code: AUTOMATION_TASK_CODES[generate_code] || generate_code,
  level,
  short_codes: [...short_codes],
});

export class TilesGenerator extends Component {
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
    } catch (error) {
      console.error("tiles automation job claim failed", error);
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
      focal_point: { ...frame_settings.focal_point },
      scope: frame_settings.scope,
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
      this.add_automation_task(
        create_automation_task(generate_code, level, short_codes),
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
    const { automation_mode, coverage_data, short_codes, generate_code } =
      this.state;
    if (!coverage_data) {
      return [];
    }
    if (automation_mode !== PAGE_MODE_OPERATOR) {
      return [];
    }
    return (
      <GeneratorOperations
        automation_mode={this.state.automation_mode}
        short_codes={short_codes}
        generate_code={generate_code}
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
      this.setState({ automation_running: false });
      return;
    }
    if (this.state.active_automation_job) {
      this.setState({ automation_running: true });
      return;
    }
    try {
      const response = await TilesBackend.claim_automation_job();
      if (!response.job) {
        console.warn("no ready Tiles automation job is available");
        return;
      }
      this.setState({
        active_automation_job: response.job,
        automation_running: true,
      });
      await this.refresh_automation_jobs();
    } catch (error) {
      console.error("tiles automation job claim failed", error);
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
