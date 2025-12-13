import React, {Component} from 'react';
import PropTypes from 'prop-types';

import {CoolTransportStyles as styles} from './styles/CoolTransportStyles'

const TRANSIT_CODE_PLAY = 'transit_code_play'
const TRANSIT_CODE_PAUSE = 'transit_code_pause'
// const TRANSIT_CODE_STOP = 'transit_code_pause'
const TRANSIT_CODE_BEGIN = 'transit_code_begin'
const TRANSIT_CODE_END = 'transit_code_end'
const TRANSIT_CODE_NEXT = 'transit_code_next'
const TRANSIT_CODE_PREVIOUS = 'transit_code_previous'

export class CoolMediaTransport extends Component {
   static propTypes = {
      width_px: PropTypes.number.isRequired,
      on_play: PropTypes.func.isRequired,
      on_pause: PropTypes.func.isRequired,
      on_stop: PropTypes.func.isRequired,
      disabled: PropTypes.bool,
      on_goto_begin: PropTypes.func,
      on_goto_end: PropTypes.func,
      on_goto_next: PropTypes.func,
      on_goto_previous: PropTypes.func,
   }

   state = {
      playing: false,
   }

   render() {
      const {width_px} = this.props;
      return [
         {label: '<<', tooltip: 'begin', handler_code: TRANSIT_CODE_BEGIN},
         {label: '<', tooltip: 'previous', handler_code: TRANSIT_CODE_PREVIOUS},
         {label: '->', tooltip: 'play', handler_code: TRANSIT_CODE_PLAY},
         {label: '||', tooltip: 'pause', handler_code: TRANSIT_CODE_PAUSE},
         {label: '>', tooltip: 'next', handler_code: TRANSIT_CODE_NEXT},
         {label: '>>', tooltip: 'end', handler_code: TRANSIT_CODE_END},
      ].map((button, i) => {
         const button_style = {
            minWidth: `${width_px / 16}px`,
            minHeight: `${width_px / 16}px`,
         }
         return <styles.GenericButton
            key={`transit-button-${i}`}
            style={button_style}
            title={button.tooltip}>
            {button.label}
         </styles.GenericButton>
      })
   }
}

export default CoolMediaTransport
