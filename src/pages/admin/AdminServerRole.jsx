import { Component } from "react";
import PropTypes from "prop-types";
import AppText from "../../AppText.jsx";
import {
  KEY_ADMIN_SERVERS_EDIT_ROLE,
  KEY_ADMIN_SERVERS_SAVE_ROLE,
  KEY_ADMIN_SERVERS_CANCEL_ROLE,
  KEY_ADMIN_SERVERS_ROLE_LABEL,
} from "../../text/AdminText.jsx";
import CoolEditLink from "../../utils/ui/CoolEditLink.jsx";
import CoolInputText from "../../utils/ui/CoolInputText.jsx";

export default class AdminServerRole extends Component {
  static propTypes = {
    role: PropTypes.string.isRequired,
    on_save: PropTypes.func.isRequired,
  };
  state = { editing: false };
  render() {
    const { role, on_save } = this.props;
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          flexWrap: "wrap",
          marginBottom: "0.5rem",
        }}
      >
        <strong>{AppText.get(KEY_ADMIN_SERVERS_ROLE_LABEL)}:</strong>
        {this.state.editing ? (
          <CoolInputText
            value={role}
            placeholder={role}
            style_extra={{ width: "24rem", maxWidth: "100%" }}
            actions={{
              on_confirm: (value) => {
                on_save(value);
                this.setState({ editing: false });
              },
              on_cancel: () => this.setState({ editing: false }),
              confirm_title: AppText.get(KEY_ADMIN_SERVERS_SAVE_ROLE),
              cancel_title: AppText.get(KEY_ADMIN_SERVERS_CANCEL_ROLE),
            }}
          />
        ) : (
          <>
            <span>{role}</span>
            <CoolEditLink
              title={AppText.get(KEY_ADMIN_SERVERS_EDIT_ROLE)}
              on_click={() => this.setState({ editing: true })}
            />
          </>
        )}
      </div>
    );
  }
}
