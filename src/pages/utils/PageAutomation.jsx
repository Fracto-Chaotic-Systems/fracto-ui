import React, { Component } from "react";
import PropTypes from "prop-types";
import AppSettings, { TYPE_STRING } from "../../AppSettings.jsx";
import CoolStyles from "../../utils/ui/styles/CoolStyles.jsx";
import CoolDropdown from "../../utils/ui/CoolDropdown.jsx";

/** Modes supported by pages which expose system-driven work. */
export const PAGE_MODE_OPERATOR = "operator";
export const PAGE_MODE_AUTOMATION = "automation";
export const PAGE_MODE_MANAGER = "manager";

const PAGE_MODES = [
  PAGE_MODE_OPERATOR,
  PAGE_MODE_AUTOMATION,
  PAGE_MODE_MANAGER,
];

const MODE_COLORS = {
  [PAGE_MODE_OPERATOR]: "green",
  [PAGE_MODE_AUTOMATION]: "orange",
  [PAGE_MODE_MANAGER]: "mediumpurple",
};

const MODE_OPTIONS = PAGE_MODES.map((mode) => ({ label: mode, code: mode }));
const MODE_DROPDOWN_WIDTH_PX = 128;
const TITLE_BAR_HEIGHT_PX = 50;

/** Build the isolated persisted setting key for a page's automation mode. */
export const get_page_automation_mode_key = (automation_type) => {
  const type_key = String(automation_type)
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toUpperCase();
  return `PAGE_AUTOMATION_MODE_${type_key}`;
};

/**
 * Shared scaffold for pages that support operator, automation, and manager
 * modes.
 *
 * The page owning this component remains responsible for the mode-specific
 * work. PageAutomation provides a stable place to add the common mode
 * selection and lifecycle behavior without coupling it to a particular page.
 * The caller type is also the namespace for that page's job definitions and
 * persisted automator settings, so settings from different pages cannot
 * collide. Until those behaviors are introduced, it renders the persisted
 * mode as a compact title-bar status indicator.
 */
export class PageAutomation extends Component {
  static propTypes = {
    /** Stable caller/job type used to namespace automation settings. */
    automation_type: PropTypes.string.isRequired,
    /** Notifies the page when its persisted mode is initialized or changed. */
    on_mode_change: PropTypes.func.isRequired,
  };

  state = {
    mode: PAGE_MODE_OPERATOR,
    editing: false,
    dropdown_rect: null,
  };

  mode_setting_key = null;
  mode_subscription_key = null;

  notify_mode_change = (mode) => {
    if (!PAGE_MODES.includes(mode)) return;
    const { on_mode_change } = this.props;
    on_mode_change(mode);
  };

  componentDidMount() {
    const { automation_type } = this.props;
    const setting_key = get_page_automation_mode_key(automation_type);
    if (!AppSettings.setting_definitions[setting_key]) {
      AppSettings.setting_definitions[setting_key] = {
        description: `${automation_type} automation mode`,
        data_type: TYPE_STRING,
        default_value: PAGE_MODE_OPERATOR,
        persist: true,
      };
      const persisted_value =
        typeof localStorage !== "undefined"
          ? localStorage.getItem(setting_key)
          : null;
      AppSettings.settings_data[setting_key] = PAGE_MODES.includes(
        persisted_value,
      )
        ? persisted_value
        : PAGE_MODE_OPERATOR;
    }
    this.mode_setting_key = setting_key;
    this.mode_subscription_key = AppSettings.subscribe(
      setting_key,
      (_key, mode) => {
        if (!PAGE_MODES.includes(mode)) return;
        this.setState({ mode }, () => this.notify_mode_change(mode));
      },
    );
    const stored_mode = AppSettings.get(setting_key);
    const mode = PAGE_MODES.includes(stored_mode)
      ? stored_mode
      : PAGE_MODE_OPERATOR;
    this.setState({ mode });
    this.notify_mode_change(mode);
  }

  componentWillUnmount() {
    if (this.mode_subscription_key) {
      AppSettings.unsubscribe(this.mode_subscription_key);
    }
  }

  /** Persist a new mode for this page's isolated automation namespace. */
  set_mode = (mode) => {
    if (!PAGE_MODES.includes(mode) || !this.mode_setting_key) return;
    AppSettings.on_settings_changed({ [this.mode_setting_key]: mode });
  };

  begin_mode_edit = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    this.setState({
      editing: true,
      dropdown_rect: {
        top: bounds.bottom - TITLE_BAR_HEIGHT_PX,
        left: Math.max(0, bounds.right - MODE_DROPDOWN_WIDTH_PX),
      },
    });
  };

  on_mode_select = (mode) => {
    if (PAGE_MODES.includes(mode)) this.set_mode(mode);
    this.setState({ editing: false, dropdown_rect: null });
  };

  render_mode_option = (item) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontStyle: "italic",
        textTransform: "uppercase",
        letterSpacing: "1px",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: "10px",
          height: "10px",
          marginRight: "0.35rem",
          borderRadius: "50%",
          backgroundColor: MODE_COLORS[item.code],
        }}
      />
      {item.label}
    </span>
  );

  render() {
    const { mode, editing, dropdown_rect } = this.state;
    const position_style = {
      position: "absolute",
      right: "0.5rem",
      top: 0,
      height: "100%",
      display: "inline-flex",
      alignItems: "flex-start",
      boxSizing: "border-box",
      lineHeight: "24px",
      letterSpacing: "1px",
    };
    if (editing && dropdown_rect) {
      return (
        <CoolDropdown
          items={MODE_OPTIONS}
          reference_rect={dropdown_rect}
          callback={this.on_mode_select}
          render_item={this.render_mode_option}
        />
      );
    }
    return (
      <CoolStyles.InlineBlock
        onClick={this.begin_mode_edit}
        style={{
          ...position_style,
          padding: "0 0.5rem",
          fontSize: "0.75rem",
          fontStyle: "italic",
          textTransform: "uppercase",
          lineHeight: "10px",
          cursor: "pointer",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: "10px",
            height: "10px",
            marginRight: "0.35rem",
            borderRadius: "50%",
            backgroundColor: MODE_COLORS[mode],
            verticalAlign: "middle",
          }}
        />
        {mode}
      </CoolStyles.InlineBlock>
    );
  }
}

export default PageAutomation;
