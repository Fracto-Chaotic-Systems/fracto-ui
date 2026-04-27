import React, {Component} from "react";
import PropTypes, {bool} from "prop-types";
import FractoColors from "../../../../../../sdk/FractoColors.js";

export class GeneratorTile extends Component {
   static propTypes = {
      width_px: PropTypes.number.isRequired,
      short_code: PropTypes.string.isRequired,
      canvas_buffer: PropTypes.array.isRequired,
   }

   state = {
      canvas_ref: React.createRef(),
   }

   componentDidMount() {
      this.fill_buffer()
   }

   componentDidUpdate(prevProps, prevState, snapshot) {
      if (prevProps.short_code !== this.props.short_code) {
         this.fill_buffer()
      }
   }

   fill_buffer = () => {
      const {canvas_ref} = this.state
      const {width_px, canvas_buffer} = this.props;
      const ctx = canvas_ref.current.getContext('2d');
      FractoColors.buffer_to_canvas(canvas_buffer, ctx, width_px / 255);
   }

   render() {
      const {canvas_ref} = this.state
      const {width_px, short_code, canvas_buffer} = this.props
      const canvas_style = {
         width: `${width_px}px`,
         height: `${width_px}px`,
      }
      return <canvas
         key={short_code}
         ref={canvas_ref}
         style={canvas_style}
         width={width_px}
         height={width_px}
      />
   }
}

export default GeneratorTile
