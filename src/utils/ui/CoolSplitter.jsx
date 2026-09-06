import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import { CoolStyles, CoolColors } from "./CoolImports.jsx";

export const SPLITTER_TYPE_HORIZONTAL = "horizontal";
export const SPLITTER_TYPE_VERTICAL = "vertical";
const SPLITTER_BORDER_COLOR = "#aaaaaa";

const SplitterBar = styled(CoolStyles.InlineBlock)`
  ${CoolStyles.absolute}
  ${CoolStyles.noselect}
  background-color: #eeeeee;
  z-index: 100;
  border: 1px solid ${SPLITTER_BORDER_COLOR};
`;

export class CoolSplitter extends Component {
  static propTypes = {
    type: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    bar_width_px: PropTypes.number.isRequired,
    container_bounds: PropTypes.object.isRequired,
    position: PropTypes.number.isRequired,
    on_change: PropTypes.func.isRequired,
    min_position: PropTypes.number,
    max_position: PropTypes.number,
  };

  state = {
    splitter_ref: React.createRef(),
    in_drag: false,
    drag_start_pos: 0,
  };

  get_bounded_position = (position = this.props.position) => {
    const { min_position, max_position } = this.props;
    return Math.min(
      max_position ?? position,
      Math.max(min_position ?? position, position),
    );
  };

  normalize_position = () => {
    const { position, on_change } = this.props;
    const bounded_position = this.get_bounded_position(position);
    if (bounded_position !== position) {
      on_change(bounded_position);
    }
  };

  componentDidMount() {
    this.normalize_position();
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.position !== this.props.position ||
      prevProps.min_position !== this.props.min_position ||
      prevProps.max_position !== this.props.max_position
    ) {
      this.normalize_position();
    }
  }

  start_drag = (e) => {
    const { type, position } = this.props;
    // console.log("start_drag", position)
    const drag_start_pos =
      type === SPLITTER_TYPE_HORIZONTAL ? e.clientY : e.clientX;
    this.setState({
      in_drag: true,
      drag_start_pos: drag_start_pos,
    });
    window.addEventListener("mouseup", this.end_drag);
    window.addEventListener("mousemove", this.on_mouse_move);
  };

  end_drag = (e) => {
    this.setState({ in_drag: false });
    window.removeEventListener("mouseup", this.end_drag);
    window.removeEventListener("mousemove", this.on_mouse_move);
  };

  on_mouse_move = (e) => {
    const { in_drag, drag_start_pos, splitter_ref } = this.state;
    const { type, position, on_change, min_position, max_position } = this.props;
    if (!in_drag) {
      return;
    }
    if (isNaN(position)) {
      return;
    }
    const splitter = splitter_ref.current;
    if (splitter) {
      const delta =
        type === SPLITTER_TYPE_HORIZONTAL
          ? drag_start_pos - e.clientY
          : drag_start_pos - e.clientX;
      const new_drag_start_pos =
        type === SPLITTER_TYPE_HORIZONTAL ? e.clientY : e.clientX;
      this.setState({ drag_start_pos: new_drag_start_pos });
      const next_position = position - delta;
      const bounded_position = Math.min(
        max_position ?? next_position,
        Math.max(min_position ?? next_position, next_position),
      );
      on_change(bounded_position);
    }
  };

  render() {
    const { in_drag, splitter_ref } = this.state;
    const { type, bar_width_px, container_bounds } = this.props;
    const position = this.get_bounded_position();
    let bar_style =
      type === SPLITTER_TYPE_HORIZONTAL
        ? {
            left: container_bounds.left,
            top: position - bar_width_px / 2,
            width: container_bounds.width,
            height: bar_width_px,
            cursor: "ns-resize",
          }
        : {
            top: container_bounds.top,
            left: position - bar_width_px / 2,
            width: bar_width_px,
            height: container_bounds.height,
            cursor: "ew-resize",
          };
    bar_style.backgroundColor = in_drag ? CoolColors.cool_blue : "#eeeeee";
    return (
      <SplitterBar
        ref={splitter_ref}
        style={bar_style}
        onMouseDown={(e) => this.start_drag(e)}
        onMouseUp={(e) => this.end_drag(e)}
        onMouseMove={(e) => this.on_mouse_move(e)}
      />
    );
  }
}

export default CoolSplitter;
