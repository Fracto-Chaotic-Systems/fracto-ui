import React, { Component } from "react";
import PropTypes from "prop-types";

import AppText from "../AppText.jsx";
import { WelcomeStyles as styles } from "../styles/WelcomeStyles.jsx";
import {
  KEY_WELCOME_ACCESS_DENIED,
  KEY_WELCOME_AUTH_ERROR,
  KEY_WELCOME_CHECKING_ACCESS,
  KEY_WELCOME_SIGN_IN,
  KEY_WELCOME_START,
} from "../text/WelcomeText.jsx";

/**
 * OIDC-specific welcome workflow surface.
 *
 * This component owns provider-login states and messaging so the welcome page
 * remains responsible only for composition and the animated background.
 */
export class WelcomeOIDC extends Component {
  static propTypes = {
    auth_status: PropTypes.string,
    on_login: PropTypes.func,
    on_start: PropTypes.func,
  };

  handle_action = (event) => {
    event.stopPropagation();
    const { auth_status, on_login, on_start } = this.props;
    if (auth_status === "anonymous" || auth_status === "error") {
      on_login?.();
    } else if (auth_status === "bypass" || auth_status === "authenticated") {
      on_start?.();
    }
  };

  render() {
    const { auth_status } = this.props;
    const message =
      auth_status === "checking"
        ? AppText.get(KEY_WELCOME_CHECKING_ACCESS)
        : auth_status === "denied"
          ? AppText.get(KEY_WELCOME_ACCESS_DENIED)
          : auth_status === "error"
            ? AppText.get(KEY_WELCOME_AUTH_ERROR)
            : null;
    const action_label =
      auth_status === "anonymous" || auth_status === "error"
        ? AppText.get(KEY_WELCOME_SIGN_IN)
        : AppText.get(KEY_WELCOME_START);
    return (
      <styles.OIDCPlaceholder>
        {message}
        {(auth_status === "anonymous" ||
          auth_status === "error" ||
          auth_status === "bypass" ||
          auth_status === "authenticated") && (
          <styles.OIDCAction onClick={this.handle_action}>
            {action_label}
          </styles.OIDCAction>
        )}
      </styles.OIDCPlaceholder>
    );
  }
}

export default WelcomeOIDC;
