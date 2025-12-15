import React, {Component} from 'react';
import PropTypes from 'prop-types';
import styled from "styled-components";

import {CoolStyles, CoolColors} from "./CoolImports";

const BasicButton = styled(CoolStyles.InlineBlock)`
   ${CoolStyles.pointer}
   ${CoolStyles.noselect}
   border-radius: 0.25rem;
   padding: 0.325rem 0.75rem;
`;

export class CoolButton extends Component {

   static propTypes = {
      content: PropTypes.elementType.isRequired,
      on_click: PropTypes.func.isRequired,
      style: PropTypes.object,
      primary: PropTypes.bool,
      disabled: PropTypes.bool,
   }

   static defaultProps = {
      primary: false,
      disabled: false,
      style: {},
   }

   render() {
      const {content, on_click, style, primary, disabled} = this.props;
      let new_style = JSON.parse(JSON.stringify(style)) || {}
      if (primary) {
         new_style.color = "white";
         new_style.backgroundColor = CoolColors.deep_blue
      } else {
         new_style.color = "#333333";
         new_style.backgroundColor = "#cccccc"
      }
      if (disabled) {
         new_style.opacity = 0.5;
         new_style.cursor = "default";
         return <BasicButton style={new_style}>{content}</BasicButton>
      }
      else {
         new_style.opacity = 1.0;
         new_style.cursor = "pointer";
      }
      return <BasicButton
         style={new_style}
         onClick={e => on_click(e)}>
         {content}
      </BasicButton>
   }
}

export default CoolButton;