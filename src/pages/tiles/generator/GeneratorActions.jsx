import React, { Component } from "react";
import PropTypes from "prop-types";

import { MainStyles as styles } from "../../../styles/MainStyles.jsx";
import GeneratorActiveState from "./GeneratorActiveState.jsx";
import GeneratorActiveProgress, {
  NUMERAL_STYLE,
  TITLE_TEXT_STYLE,
} from "./GeneratorActiveProgress.jsx";

export class GeneratorActions extends Component {
  static propTypes = {
    tiles: PropTypes.array.isRequired,
    tile_index: PropTypes.number.isRequired,
    tile_points: PropTypes.array.isRequired,
    in_progress: PropTypes.bool.isRequired,
    on_start_pause: PropTypes.func.isRequired,
    on_context_ready: PropTypes.func.isRequired,
    canvas_buffer: PropTypes.array,
  };

  static defaultProps = {
    canvas_buffer: null,
  };

  render_preamble = () => {
    const { tiles, tile_index } = this.props;
    const level = (
      <styles.NumericValue style={NUMERAL_STYLE}>
        {tiles[0].short_code.length}
      </styles.NumericValue>
    );
    const count = (
      <styles.NumericValue style={NUMERAL_STYLE}>
        {tiles.length}
      </styles.NumericValue>
    );
    let message = [`Generating `, count, ` tiles of level `, level];
    if (tile_index === tiles.length) {
      message = [`Generated `, count, ` tiles of level `, level];
    }
    return (
      <styles.CenteredBlock style={TITLE_TEXT_STYLE}>
        {message}
      </styles.CenteredBlock>
    );
  };

  render() {
    const {
      on_context_ready,
      on_start_pause,
      in_progress,
      tiles,
      tile_index,
      canvas_buffer,
      tile_points,
    } = this.props;
    if (tile_index < 0) {
      return [];
    }
    const preamble = this.render_preamble();
    const active_state = (
      <GeneratorActiveState
        tiles={tiles}
        tile_index={tile_index}
        tile_points={tile_points}
        canvas_buffer={canvas_buffer}
        on_context_ready={on_context_ready}
      />
    );
    const active_progress = (
      <GeneratorActiveProgress
        tiles={tiles}
        tile_index={tile_index}
        in_progress={in_progress}
        on_start_pause={on_start_pause}
      />
    );
    return [preamble, active_state, <styles.OneRemDown />, active_progress];
  }
}

export default GeneratorActions;
