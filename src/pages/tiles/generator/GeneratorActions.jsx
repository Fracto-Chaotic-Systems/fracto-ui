import React, {Component} from "react";
import PropTypes from "prop-types";
import GeneratorContext from "./GeneratorContext.jsx";

import {MainStyles as styles} from "../../../styles/MainStyles.jsx";
import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";
import {TILE_RENDER_WIDTH_PX} from "./GeneratorOperations.jsx";

export class GeneratorOperations extends Component {
   static propTypes = {
      tile: PropTypes.object.isRequired,
      tile_index: PropTypes.number.isRequired,
   }

   state = {
      ready_short_code: null,
   }

   context_ready = () => {
      const {tile} = this.props
      this.setState({
         ready_short_code: tile.short_code
      });
   }

   render_context = () => {
      const {tile, tile_index} = this.props
      if (tile_index < 0) {
         return []
      }
      const context_style = {
         height: `${TILE_RENDER_WIDTH_PX}px`,
         boxShadow: '5px 5px 10px rgba(0, 0, 0, 0.25)',
      }
      return <styles.FixedInlineBlock
         style={context_style}>
         <GeneratorContext
            tile={tile}
            key={tile_index}
            on_plan_complete={this.context_ready}
         />
      </styles.FixedInlineBlock>
   }

   render() {
      const {tile_index} = this.props
      if (tile_index < 0) {
         return []
      }
      const context = this.render_context()
      return [context]
   }
}

export default GeneratorOperations
