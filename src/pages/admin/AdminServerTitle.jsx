import { Component } from "react";
import PropTypes from "prop-types";
import AppText from "../../AppText.jsx";
import {
  KEY_ADMIN_SERVERS_EDIT_TITLE,
  KEY_ADMIN_SERVERS_SAVE_TITLE,
  KEY_ADMIN_SERVERS_CANCEL_TITLE,
} from "../../text/AdminText.jsx";
import MarkdownStyles from "../../utils/ui/styles/MarkdownStyles.jsx";
import CoolEditLink from "../../utils/ui/CoolEditLink.jsx";
import CoolInputText from "../../utils/ui/CoolInputText.jsx";

export default class AdminServerTitle extends Component {
  static propTypes = {
    title: PropTypes.string.isRequired,
    on_save: PropTypes.func.isRequired,
  };
  state = { editing: false };
  render() {
    const { title, on_save } = this.props;
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        {this.state.editing ? (
          <CoolInputText
            value={title}
            placeholder={title}
            style_extra={{
              fontSize: "1.5rem",
              width: "24rem",
              maxWidth: "100%",
            }}
            actions={{
              on_confirm: (value) => {
                on_save(value);
                this.setState({ editing: false });
              },
              on_cancel: () => this.setState({ editing: false }),
              confirm_title: AppText.get(KEY_ADMIN_SERVERS_SAVE_TITLE),
              cancel_title: AppText.get(KEY_ADMIN_SERVERS_CANCEL_TITLE),
            }}
          />
        ) : (
          <>
            <MarkdownStyles.Heading1>{title}</MarkdownStyles.Heading1>
            <CoolEditLink
              title={AppText.get(KEY_ADMIN_SERVERS_EDIT_TITLE)}
              on_click={() => this.setState({ editing: true })}
            />
          </>
        )}
      </div>
    );
  }
}
