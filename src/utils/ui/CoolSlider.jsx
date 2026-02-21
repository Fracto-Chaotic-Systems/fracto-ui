import React, {Component} from 'react';
import PropTypes from 'prop-types';
import styled from "styled-components";

import Slider from '@mui/material/Slider';
// import CoolStyles from "./CoolStyles";

export const SLIDER_WIDTH_PX = 15;

const StyledSlider = styled(Slider)`
   vertical-align: middle;
   height: 1rem;
   width: inherit;
`;

const StyledVerticalSlider = styled(Slider)`
   margin: auto;
   padding: 0 6px !important;
`;

export class CoolSlider extends Component {

   static propTypes = {
      value: PropTypes.number.isRequired,
      min: PropTypes.number.isRequired,
      max: PropTypes.number.isRequired,
      on_change: PropTypes.func.isRequired,
      step_count: PropTypes.number,
      is_vertical: PropTypes.bool
   }

   static defaultProps = {
      step_count: 100,
      is_vertical: true,
   }

   render() {
      const {value, min, max, on_change, step_count, is_vertical} = this.props;
      return !is_vertical ? <StyledSlider
         max={max}
         min={min}
         step={(max - min) / step_count}
         value={value}
         onChange={on_change}
         orientation={"horizontal"}
         valueLabelDisplay={"auto"}
         size={'small'}
      /> : <StyledVerticalSlider
         max={max}
         min={min}
         step={(max - min) / step_count}
         value={value}
         onChange={on_change}
         orientation={"vertical"}
         valueLabelDisplay={"auto"}
         size={'small'}
      />
   }
}

export default CoolSlider;
