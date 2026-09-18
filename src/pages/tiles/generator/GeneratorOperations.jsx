import React, { Component } from "react";
import PropTypes from "prop-types";

import { MARGIN_PX } from "../../../styles/MainStyles.jsx";
import CoolStyles, {
  CELL_LABEL_STYLE,
} from "../../../utils/ui/styles/CoolStyles.jsx";
import AppText from "../../../AppText.jsx";
import { PAGE_MODE_AUTOMATION } from "../../utils/PageAutomation.jsx";
import {
  KEY_TILES_GENERATOR_AUTOMATION_OPERATION,
  KEY_TILES_GENERATOR_AUTOMATION_ATTEMPT,
  KEY_TILES_GENERATOR_AUTOMATION_COUNTDOWN,
  KEY_TILES_GENERATOR_AUTOMATION_ERROR,
  KEY_TILES_GENERATOR_AUTOMATION_PROGRESS,
  KEY_TILES_GENERATOR_AUTOMATION_STATE,
  KEY_TILES_GENERATOR_AUTOMATION_TASK,
} from "../../../text/TilesText.jsx";

import { generate_tile_points } from "./GeneratorInterface.jsx";
import { bounds_from_short_code } from "../TilesUtils.jsx";
import GeneratorActions from "./GeneratorActions.jsx";
import GeneratorHistory from "./GeneratorHistory.jsx";
import { tiles_operation_name } from "./TilesAutomationOperations.jsx";

export const TILE_RENDER_WIDTH_PX = 300;
const ACTIONS_WIDTH_PX = 2 * TILE_RENDER_WIDTH_PX + 3 * MARGIN_PX;

const NEXT_TILE_DELAY_MS = 150;

export class GeneratorOperations extends Component {
  static propTypes = {
    automation_mode: PropTypes.string.isRequired,
    short_codes: PropTypes.array.isRequired,
    generate_code: PropTypes.string.isRequired,
    automation_engine_state: PropTypes.object,
    on_automation_task_complete: PropTypes.func,
  };

  state = {
    tile_index: -1,
    tiles: [],
    in_progress: false,
    tile_points: null,
    resume_index: 0,
    history: [],
  };

  static defaultProps = {
    automation_engine_state: null,
    on_automation_task_complete: () => {},
  };

  automation_completion = null;

  componentDidMount() {
    this.prepare_short_codes();
  }

  componentWillUnmount() {
    if (this.automation_completion) {
      this.automation_completion.reject(
        new Error("Tiles automation operations were unmounted"),
      );
      this.automation_completion = null;
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    const short_codes_changed =
      this.props.short_codes.length !== prevProps.short_codes.length;
    if (short_codes_changed) {
      this.prepare_short_codes();
    }
  }

  prepare_tiles = (short_codes) => {
    const tiles = short_codes
      .map((short_code, i) => {
        return {
          short_code,
          bounds: bounds_from_short_code(short_code),
        };
      })
      .sort((a, b) => {
        return a.bounds.left === b.bounds.left
          ? a.bounds.top > b.bounds.top
            ? -1
            : 1
          : a.bounds.left > b.bounds.left
            ? 1
            : -1;
      });
    const tile_index = tiles.length ? 0 : -1;
    return { tiles, tile_index };
  };

  prepare_short_codes = () => {
    const { short_codes } = this.props;
    const { tiles, tile_index } = this.prepare_tiles(short_codes);
    this.setState({ tiles, tile_index, history: [] });
  };

  /**
   * Execute one automation task through the existing tile pipeline.
   *
   * The returned promise resolves only after every shortcode in the task has
   * produced its tile record. The engine can therefore advance safely without
   * knowing anything about GeneratorActions or tile context buffers.
   *
   * @param {Object} task Engine task with persisted data in `task.data`.
   * @returns {Promise<Object>} Completion summary for the task.
   */
  execute_automation_task = (task) => {
    if (this.props.automation_mode !== PAGE_MODE_AUTOMATION) {
      return Promise.reject(
        new Error("automation tasks require automation mode"),
      );
    }
    if (this.automation_completion) {
      return Promise.reject(new Error("a Tiles automation task is already running"));
    }
    const task_data = task?.data || task;
    const short_codes = Array.isArray(task_data?.short_codes)
      ? task_data.short_codes
      : [];
    const prepared = this.prepare_tiles(short_codes);
    const automation_task = {
      ...task_data,
      generate_code: tiles_operation_name(task_data?.generate_code),
    };
    const completion = new Promise((resolve, reject) => {
      this.automation_completion = { resolve, reject, task: automation_task };
    });
    this.setState(
      {
        ...prepared,
        automation_task,
        in_progress: prepared.tiles.length > 0,
        tile_points: null,
        resume_index: 0,
        history: [],
      },
      () => {
        if (!prepared.tiles.length) {
          this.complete_automation_task();
        }
      },
    );
    return completion;
  };

  /** Resolve the currently executing automation task. */
  complete_automation_task = () => {
    const completion = this.automation_completion;
    if (!completion) {
      return;
    }
    this.automation_completion = null;
    const summary = {
      task: completion.task,
      tile_count: this.state.tiles.length,
      history: this.state.history,
    };
    this.setState(
      {
        in_progress: false,
        tile_index: this.state.tiles.length,
        automation_task: null,
      },
      () => {
        this.props.on_automation_task_complete(summary);
        completion.resolve(summary);
      },
    );
  };

  on_start_pause = () => {
    const { in_progress, tile_index } = this.state;
    const new_state = !in_progress;
    this.setState({
      in_progress: new_state,
      resume_index: tile_index,
    });
    // console.log('on_start_pause', this.state)
    if (new_state) {
      this.setState({ tile_index: -1 });
      setTimeout(() => {
        this.setState({
          tile_index: this.state.resume_index,
        });
      }, 100);
    }
  };

  on_context_ready = (short_code, context_buffer) => {
    const { tile_index, tiles, in_progress, history } = this.state;
    // console.log(`context_ready: ${short_code}`)
    if (!in_progress) {
      return;
    }
    if (tile_index >= tiles.length) {
      this.setState({
        in_progress: false,
        tile_index: tiles.length,
      });
      return;
    }
    const tile = tiles[tile_index];
    if (tile.short_code !== short_code) {
      console.error(`tile.short_code mismatch ${short_code}`, tile);
      return;
    }
    setTimeout(() => {
      const generate_code = this.state.automation_task
        ? this.state.automation_task.generate_code
        : this.props.generate_code;
      const record = generate_tile_points(tile, generate_code, context_buffer);
      this.setState({ tile_points: record.tile_points });

      record.tile_points = null;
      record.tile_index = this.state.tile_index;
      history.push(record);
      this.setState({ history });

      if (tile_index === tiles.length - 1) {
        this.setState({
          in_progress: false,
          tile_index: tiles.length,
        }, this.complete_automation_task);
      } else {
        this.setState({ tile_index: tile_index + 1 });
      }
    }, NEXT_TILE_DELAY_MS);
  };

  actions_block = () => {
    const { tile_index, tiles, in_progress, tile_points } = this.state;
    const actions = (
      <GeneratorActions
        tiles={tiles}
        tile_index={tile_index}
        tile_points={tile_points}
        in_progress={in_progress}
        on_start_pause={this.on_start_pause}
        on_context_ready={this.on_context_ready}
      />
    );
    const block_style = {
      width: `${ACTIONS_WIDTH_PX}px`,
      padding: `${MARGIN_PX}px`,
    };
    return <CoolStyles.Block style={block_style}>{actions}</CoolStyles.Block>;
  };

  history_block = (history) => {
    const { tile_index } = this.state;
    const { generate_code, short_codes } = this.props;
    const block_style = {
      paddingLeft: `1rem`,
    };
    return (
      <CoolStyles.Block style={block_style}>
        <GeneratorHistory
          all_records={history}
          tile_index={tile_index}
          generate_code={generate_code}
          tile_count={short_codes.length}
        />
      </CoolStyles.Block>
    );
  };

  /** Render the engine snapshot without coupling this component to the engine. */
  automation_status_block = () => {
    const { automation_engine_state } = this.props;
    if (!automation_engine_state) {
      return null;
    }
    const progress_percent = Math.round(
      (automation_engine_state.progress || 0) * 100,
    );
    const error_message = automation_engine_state.error
      ? automation_engine_state.error.message ||
        String(automation_engine_state.error)
      : "";
    const label_style = {
      ...CELL_LABEL_STYLE,
      display: "inline-block",
      marginRight: "1rem",
    };
    return (
      <CoolStyles.Block
        style={{
          display: "inline-block",
          width: "100%",
          padding: `${MARGIN_PX}px`,
          borderBottom: "1px double #888888",
        }}
      >
        <div style={label_style}>
          {AppText.get(KEY_TILES_GENERATOR_AUTOMATION_STATE)}: {" "}
          {automation_engine_state.state}
        </div>
        <div style={label_style}>
          {AppText.get(KEY_TILES_GENERATOR_AUTOMATION_PROGRESS)}: {" "}
          {progress_percent}%
        </div>
        <div style={label_style}>
          {AppText.get(KEY_TILES_GENERATOR_AUTOMATION_TASK)}: {" "}
          {automation_engine_state.task_index + 1}
        </div>
        <div style={label_style}>
          {AppText.get(KEY_TILES_GENERATOR_AUTOMATION_OPERATION)}: {" "}
          {automation_engine_state.current_operation || ""}
        </div>
        <div style={label_style}>
          {AppText.get(KEY_TILES_GENERATOR_AUTOMATION_ATTEMPT)}: {" "}
          {automation_engine_state.operation_attempt || 0}
        </div>
        {automation_engine_state.operation_detail != null ? (
          <div style={label_style}>
            {AppText.get(KEY_TILES_GENERATOR_AUTOMATION_COUNTDOWN)} {" "}
            {automation_engine_state.operation_detail}
          </div>
        ) : null}
        {error_message ? (
          <div style={{ ...label_style, color: "#cc3333" }}>
            {AppText.get(KEY_TILES_GENERATOR_AUTOMATION_ERROR)}: {" "}
            {error_message}
          </div>
        ) : null}
      </CoolStyles.Block>
    );
  };

  render() {
    const { history } = this.state;
    const { automation_mode } = this.props;
    if (automation_mode === PAGE_MODE_AUTOMATION && !this.props.automation_engine_state) {
      return <CoolStyles.Block style={{ display: "none" }} />;
    }
    const actions_block = this.actions_block();
    const history_block = this.history_block(history);
    const status_block =
      automation_mode === PAGE_MODE_AUTOMATION
        ? this.automation_status_block()
        : null;
    return (
      <CoolStyles.Block style={{ height: `40rem` }}>
        {status_block}
        {actions_block}
        {history_block}
      </CoolStyles.Block>
    );
  }
}

export default GeneratorOperations;
