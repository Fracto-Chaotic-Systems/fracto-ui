import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import CoolStyles from "./styles/CoolStyles.jsx";
import CoolColors from "./CoolColors.jsx";

const BasicButton = styled(CoolStyles.InlineBlock)`
  ${CoolStyles.pointer}
  ${CoolStyles.noselect}
    ${CoolStyles.uppercase}
    ${CoolStyles.italic}
    ${CoolStyles.align_middle}
    border-radius: 0.25rem;
  line-height: 1.25rem;
  font-size: 0.75rem;
  padding: 0.125rem 1rem;
  margin-right: 0.5rem;
`;

/** Square variant for compact controls whose content is an icon. */
const IconButton = styled(BasicButton)`
  ${CoolStyles.tight_box_shadow}
  ${CoolStyles.narrow_text_shadow}
  ${CoolStyles.pointer}
  ${CoolStyles.bold}
  ${CoolStyles.align_center}
  ${CoolStyles.align_middle}
  width: 35px;
  height: 35px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: white;
  border: 1px solid #444444;
  margin: 0 2px;
  border-radius: 3px;
  padding: 0;
  overflow: hidden;
  background: linear-gradient(150deg, #bbbbbb, #666666);

  svg {
    width: 20px;
    height: 20px;
    fill: #ffffff;
    filter: drop-shadow(0.125rem 0.125rem 0.25rem rgba(0, 0, 0, 0.75));
  }
`;

export class CoolButton extends Component {
  static propTypes = {
    content: PropTypes.node.isRequired,
    on_click: PropTypes.func.isRequired,
    style: PropTypes.object,
    primary: PropTypes.bool,
    disabled: PropTypes.bool,
    title: PropTypes.string,
    aria_label: PropTypes.string,
  };

  static defaultProps = {
    primary: false,
    disabled: false,
    style: {},
  };

  /** Allows visual variants to reuse the button behavior and state rules. */
  get_button_component = () => BasicButton;

  render() {
    const { content, on_click, style, primary, disabled, title, aria_label } =
      this.props;
    const ButtonComponent = this.get_button_component();
    const is_icon_button = ButtonComponent === IconButton;
    let new_style = JSON.parse(JSON.stringify(style)) || {};
    if (primary) {
      new_style.color = "white";
      new_style.backgroundColor = CoolColors.deep_blue;
    } else if (!is_icon_button) {
      new_style.color = "#333333";
      new_style.backgroundColor = "#cccccc";
    }
    if (disabled) {
      new_style.opacity = 0.5;
      new_style.cursor = "default";
      return (
        <ButtonComponent
          style={new_style}
          title={title}
          aria-label={aria_label}
        >
          {content}
        </ButtonComponent>
      );
    } else {
      new_style.opacity = 1.0;
      new_style.cursor = "pointer";
    }
    return (
      <ButtonComponent
        style={new_style}
        onClick={(e) => on_click(e)}
        title={title}
        aria-label={aria_label}
      >
        {content}
      </ButtonComponent>
    );
  }
}

/**
 * Square icon-button variant of CoolButton.
 *
 * It accepts the same props as CoolButton; `content` should be an SVG or
 * another compact visual element rather than a text label.
 */
export class CoolIconButton extends CoolButton {
  get_button_component = () => IconButton;
}

export default CoolButton;
