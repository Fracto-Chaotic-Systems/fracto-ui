import React, { Component } from "react";
import PropTypes from "prop-types";

import CoolStyles from "./styles/CoolStyles.jsx";
import { checkmark_icon, close_icon } from "./CoolIcons.jsx";
import { CoolIconButton } from "./CoolButton.jsx";

export class CoolInputText extends Component {
  static propTypes = {
    value: PropTypes.string.isRequired,
    style_extra: PropTypes.object,
    placeholder: PropTypes.string,
    callback: PropTypes.func,
    is_text_area: PropTypes.bool,
    on_change: PropTypes.func,
    name: PropTypes.string,
    actions: PropTypes.shape({
      on_confirm: PropTypes.func,
      on_cancel: PropTypes.func,
      confirm_title: PropTypes.string,
      cancel_title: PropTypes.string,
    }),
  };

  static defaultProps = {
    style_extra: {},
    callback: null,
    placeholder: "",
    is_text_area: false,
    name: Math.random().toString(36),
    actions: null,
  };

  state = {
    current_value: this.props.value,
    input_ref: React.createRef(),
  };

  componentDidMount() {
    const { input_ref } = this.state;
    const { value } = this.props;
    // console.log('value', value)
    this.key_handler = (key) => {
      if (key.code === "Escape") {
        document.removeEventListener("keydown", this.key_handler);
        this.cancel_action();
      }
      if (key.code === "Enter" || key.code === "NumpadEnter") {
        document.removeEventListener("keydown", this.key_handler);
        if (input_ref.current) {
          this.confirm_action(input_ref.current.value);
        }
      }
    };
    document.addEventListener("keydown", this.key_handler);
    this.setState({ current_value: value });
  }

  componentWillUnmount() {
    if (this.key_handler) {
      document.removeEventListener("keydown", this.key_handler);
    }
  }

  confirm_action = (next_value) => {
    const { actions, callback } = this.props;
    if (actions?.on_confirm) {
      actions.on_confirm(next_value);
    } else if (callback) {
      callback(next_value);
    }
  };

  cancel_action = () => {
    const { actions, callback, value } = this.props;
    if (actions?.on_cancel) {
      actions.on_cancel();
    } else if (callback) {
      callback(value);
    }
  };

  on_change = (value) => {
    const { on_change } = this.props;
    this.setState({ current_value: value });
    if (on_change) {
      on_change(value);
    }
  };

  render() {
    const { input_ref, current_value } = this.state;
    const {
      placeholder,
      style_extra,
      is_text_area,
      callback,
      name,
      value,
      actions,
    } = this.props;
    const input = is_text_area ? (
      <CoolStyles.InputTextArea
        ref={input_ref}
        autoFocus
        size={current_value?.length}
        style={style_extra}
        value={current_value || value}
        name={name}
        rows={5}
        cols={40}
        onChange={(e) => this.on_change(e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <input
        value={current_value || value}
        name={name}
        id={name}
        ref={input_ref}
        autoFocus={true}
        size={current_value?.length || 20}
        style={style_extra}
        onChange={(e) => this.on_change(e.target.value)}
        onBlur={actions ? undefined : () => callback?.(input_ref.current.value)}
        placeholder={placeholder}
      />
    );
    if (!actions) {
      return input;
    }
    return (
      <CoolStyles.InlineBlock
        style={{ display: "inline-flex", alignItems: "center" }}
      >
        {input}
        <CoolIconButton
          content={checkmark_icon}
          on_click={() =>
            this.confirm_action(input_ref.current?.value || "")
          }
          title={actions.confirm_title}
          aria_label={actions.confirm_title}
          style={{
            width: "20px",
            height: "20px",
            margin: "0 1px",
          }}
          icon_style={{ fill: "#90ee90" }}
        />
        <CoolIconButton
          content={close_icon}
          on_click={this.cancel_action}
          title={actions.cancel_title}
          aria_label={actions.cancel_title}
          style={{
            width: "20px",
            height: "20px",
            margin: "0 1px",
          }}
          icon_style={{ fill: "#f08080" }}
        />
      </CoolStyles.InlineBlock>
    );
  }
}

export default CoolInputText;
