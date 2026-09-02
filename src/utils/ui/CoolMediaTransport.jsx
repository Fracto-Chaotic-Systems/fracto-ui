import React, {Component} from 'react';
import PropTypes from 'prop-types';

import {CoolTransportStyles as styles} from './styles/CoolTransportStyles.jsx'
import {
   transport_begin_icon,
   transport_end_icon,
   transport_pause_icon,
   transport_play_icon,
   transport_reverse_icon,
} from './CoolIcons.jsx'

/** Transport operation identifiers accepted by the `operations` prop. */
export const TRANSPORT_BEGIN = 'begin'
export const TRANSPORT_REVERSE = 'reverse'
export const TRANSPORT_PAUSE = 'pause'
export const TRANSPORT_PLAY = 'play'
export const TRANSPORT_END = 'end'

/**
 * Default transport order. Consumers may provide a subset or a different
 * ordering without changing the component or its icon rendering.
 */
export const DEFAULT_TRANSPORT_OPERATIONS = [
   TRANSPORT_BEGIN,
   TRANSPORT_REVERSE,
   TRANSPORT_PAUSE,
   TRANSPORT_PLAY,
   TRANSPORT_END,
]

const OPERATION_BUTTONS = {
   [TRANSPORT_BEGIN]: {icon: transport_begin_icon, tooltip: 'begin'},
   [TRANSPORT_REVERSE]: {icon: transport_reverse_icon, tooltip: 'reverse'},
   [TRANSPORT_PAUSE]: {icon: transport_pause_icon, tooltip: 'pause'},
   [TRANSPORT_PLAY]: {icon: transport_play_icon, tooltip: 'play'},
   [TRANSPORT_END]: {icon: transport_end_icon, tooltip: 'end'},
}

export class CoolMediaTransport extends Component {
   /**
    * Render an ordered set of transport buttons and report selections through
    * one generic callback. Unknown operation identifiers are ignored, allowing
    * new operation types to be introduced incrementally.
    *
    * @param {number} width_px Width budget used to size each button.
    * @param {string[]} operations Ordered operation identifiers to display.
    * @param {(operation: string) => void} on_operation Called when a button is clicked.
    * @param {boolean} [disabled] Disables all rendered buttons.
    */
   static propTypes = {
      width_px: PropTypes.number.isRequired,
      on_operation: PropTypes.func.isRequired,
      operations: PropTypes.arrayOf(PropTypes.string),
      disabled: PropTypes.bool,
      on_goto_begin: PropTypes.func,
      on_goto_end: PropTypes.func,
   }

   state = {
      playing: false,
   }

   static defaultProps = {
      operations: DEFAULT_TRANSPORT_OPERATIONS,
   }

   render() {
      const {width_px, on_operation, operations, disabled} = this.props;
      return operations.map((operation, i) => {
         const button = OPERATION_BUTTONS[operation]
         if (!button) return null
         const button_size = Math.round(width_px / Math.max(operations.length, 1)) + 4
         const button_style = {
            width: `${button_size}px`,
            height: `${button_size}px`,
            padding: 0,
            boxSizing: 'border-box',
         }
         return <styles.GenericButton
            key={`transit-button-${i}`}
            style={button_style}
            title={button.tooltip}
            onClick={() => on_operation(operation)}
            disabled={disabled}>
            {button.icon}
         </styles.GenericButton>
      })
   }
}

export default CoolMediaTransport
