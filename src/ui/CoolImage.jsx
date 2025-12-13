import React, {Component} from 'react';
import PropTypes from 'prop-types';
// import styled from "styled-components";

import Magnifier from "react-magnifier";

// import {AppStyles} from "app/AppImports";

const STANDARD_RIGHTS_CLAIM = "Copyright This Very Moment, Am Chill Whale Productions. All Rights Reserved."

export class CoolImage extends Component {

   static propTypes = {
      src: PropTypes.string.isRequired,
      width_px: PropTypes.number.isRequired,
      zoom_factor: PropTypes.number,
      alt_text: PropTypes.string,
   }

   static defaultProps = {
      zoom_factor: 1.0,
      alt_text: STANDARD_RIGHTS_CLAIM,
   }

   render () {
      const {src, width_px, zoom_factor} = this.props;
      return <Magnifier
         src={src}
         width={`${width_px}px`}
         zoomFactor={zoom_factor}
         style={{imageRendering: "pixelated"}}
         mgWidth={width_px / 2}
         mgHeight={width_px / 2}
      />
   }

}

export default CoolImage;

