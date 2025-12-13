import React, {Component} from 'react';
import PropTypes from 'prop-types';
// import styled from "styled-components";
//
// import {AppStyles, AppColors} from "app/AppImports";

export class CoolCanvas extends Component {

   constructor(props) {
      super(props);
      this.state.canvas_ref = React.createRef();
   }

   static propTypes = {
      width_px: PropTypes.number.isRequired,
      height_px: PropTypes.number.isRequired,
      on_init: PropTypes.func.isRequired,
   }

   state = {
      // canvas_ref defined in constructor
   }

   componentDidMount() {
      const {canvas_ref} = this.state;
      const {on_init} = this.props;
      on_init(canvas_ref);
   }

   render() {
      const {canvas_ref} = this.state;
      const {width_px, height_px} = this.props;
      return <canvas
         ref={canvas_ref}
         width={width_px}
         height={height_px}/>
   }
}

export default CoolCanvas;
