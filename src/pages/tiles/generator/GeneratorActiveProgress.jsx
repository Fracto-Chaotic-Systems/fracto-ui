import React, {Component} from "react";
import PropTypes from "prop-types";

import {MainStyles as styles} from "../../../styles/MainStyles.jsx";

import {TILE_RENDER_WIDTH_PX} from "./GeneratorOperations.jsx";
import LinearProgress from "@mui/material/LinearProgress";

export const NUMERAL_STYLE = {
   fontSize: '1.25rem',
   fontStyle: 'normal',
   color: '#444444',
   lineHeight: '32px',
}

export const TITLE_TEXT_STYLE = {
   textTransform: 'uppercase',
   fontStyle: 'italic',
   fontSize: '1.0rem',
   color: '#666666',
   lineHeight: '28px',
   margin: '0 auto',
}

export class GeneratorActiveProgress extends Component {
   static propTypes = {
      tiles: PropTypes.array.isRequired,
      tile_index: PropTypes.number.isRequired,
      in_progress: PropTypes.bool.isRequired,
      on_start_pause: PropTypes.func.isRequired,
   }

   render_scale = () => {
      const {tiles, tile_index} = this.props
      if (tile_index < 0) {
         return []
      }
      const percent = Math.round(tile_index * 10000 / tiles.length) / 100
      const scale_style = {
         paddingTop: '10px',
         width: `${1.85 * TILE_RENDER_WIDTH_PX}px`,
         margin: '0 auto',
      }
      return <div
         style={scale_style}>
         <LinearProgress
            variant="determinate"
            value={percent}
            sx={{height: '8px'}}
         />
      </div>
   }

   render_progress = () => {
      const {tiles, tile_index} = this.props
      if (tile_index < 0) {
         return []
      }
      const completed = <styles.NumericValue
         style={NUMERAL_STYLE}>
         {tile_index}
      </styles.NumericValue>
      const remaining = <styles.NumericValue
         style={NUMERAL_STYLE}>
         {tiles.length - tile_index}
      </styles.NumericValue>
      const percent = Math.round(tile_index * 10000 / tiles.length) / 100
      const progress = [
         completed,
         ` completed (${percent}%), `,
         remaining,
         ` remain`
      ]
      return <styles.CenteredBlock
         style={TITLE_TEXT_STYLE}>
         {progress}
      </styles.CenteredBlock>
   }

   render_button = () => {
      const {in_progress, on_start_pause} = this.props
      const button_style = {
         padding: `0 0.5rem 0.25rem`,
      }
      const button_text = in_progress ? 'pause' : 'start'
      return <styles.BlueButton
         onClick={on_start_pause}
         style={button_style}>
         {button_text}
      </styles.BlueButton>
   }

   render() {
      const scale = this.render_scale()
      const progress = this.render_progress()
      const button = this.render_button()
      return <styles.CenteredBlock>
         {scale}
         {progress}
         {button}
      </styles.CenteredBlock>
   }
}

export default GeneratorActiveProgress
