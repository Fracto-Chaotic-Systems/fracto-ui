import {Component} from "react";
import {refresh_icon} from "./CoolIcons.jsx"

import {CoolStyles as styles} from "./CoolImports.jsx";
import PropTypes from "prop-types";
import {getViewportDimensions} from "../Dom.jsx";

export class CoolWindowListener extends Component {

   static propTypes = {
      wrapper: PropTypes.element.isRequired,
      on_resize: PropTypes.func.isRequired,
      size_px: PropTypes.string,
   }

   static defaultProps = {
      size_px: 32,
   }

   state = {
      rendered_width: 0,
      rendered_height: 0,
   }

   componentDidMount() {
      const {wrapper} = this.props;
      window.addEventListener("resize", this.resize_wrapper);
   }

   componentWillUnmount() {
      const {wrapper} = this.props;
      window.removeEventListener("resize", this.resize_wrapper);
   }

   resize_wrapper = () => {
      const {on_resize} = this.props;
      const dimensions = getViewportDimensions()
      on_resize(dimensions);
   }

   render() {
      const {size_px} = this.props;
      const icon_style = {
         width: `${size_px}px`,
         height: `${size_px}px`,
         fill: '#cccccc'
      }
      return <styles.MediumIcon
         style={icon_style}>
         {refresh_icon}
      </styles.MediumIcon>
   }
}

export default CoolWindowListener;
