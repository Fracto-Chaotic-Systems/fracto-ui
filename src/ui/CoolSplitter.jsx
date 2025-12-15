import React, {Component} from 'react';
import PropTypes from 'prop-types';
import styled from "styled-components";

import {CoolStyles, CoolColors} from './CoolImports';

export const SPLITTER_TYPE_HORIZONTAL = "horizontal";
export const SPLITTER_TYPE_VERTICAL = "vertical";
const SPLITTER_BORDER_COLOR = '#aaaaaa';

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
   }

   state = {
      splitter_ref: React.createRef(),
      in_drag: false,
      drag_start_pos: 0
   };

   start_drag = (e) => {
      const {type, position} = this.props;
      console.log("start_drag", position)
      const drag_start_pos = type === SPLITTER_TYPE_HORIZONTAL ? e.clientY : e.clientX;
      this.setState({
         in_drag: true,
         drag_start_pos: drag_start_pos
      });
      window.addEventListener("mouseup", this.end_drag);
      window.addEventListener("mousemove", this.on_mouse_move);
   }

   end_drag = (e) => {
      this.setState({in_drag: false})
      window.removeEventListener("mouseup", this.end_drag);
      window.removeEventListener("mousemove", this.on_mouse_move);
   }

   on_mouse_move = (e) => {
      const {in_drag, drag_start_pos, splitter_ref} = this.state;
      const {type, position, on_change} = this.props;
      if (!in_drag) {
         return;
      }
      if (isNaN(position)) {
         return;
      }
      const splitter = splitter_ref.current;
      if (splitter) {
         const delta = type === SPLITTER_TYPE_HORIZONTAL ?
            drag_start_pos - e.clientY : drag_start_pos - e.clientX;
         const new_drag_start_pos = type === SPLITTER_TYPE_HORIZONTAL ? e.clientY : e.clientX;
         this.setState({drag_start_pos: new_drag_start_pos})
         on_change(position - delta)
      }
   }

   render() {
      const {in_drag, splitter_ref} = this.state;
      const {type, bar_width_px, container_bounds, position} = this.props;
      let bar_style = type === SPLITTER_TYPE_HORIZONTAL ? {
         left: container_bounds.left,
         top: position - bar_width_px / 2,
         width: container_bounds.width,
         height: bar_width_px,
         cursor: "ns-resize"
      } : {
         top: container_bounds.top,
         left: position - bar_width_px / 2,
         width: bar_width_px - 1,
         height: container_bounds.height,
         cursor: "ew-resize"
      }
      bar_style.backgroundColor = in_drag ? CoolColors.cool_blue : '#eeeeee';
      return <SplitterBar
         ref={splitter_ref}
         style={bar_style}
         onMouseDown={e => this.start_drag(e)}
         onMouseUp={e => this.end_drag(e)}
         onMouseMove={e => this.on_mouse_move(e)}
      />
   }
}

export default CoolSplitter;
